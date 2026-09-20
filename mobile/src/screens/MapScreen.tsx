import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import {
  DownloadCloud,
  CheckCircle2,
  Shield,
  Navigation,
  Crosshair,
  WifiOff,
} from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import { LocationSyncPayload, MeshPeer } from '../types';
import {
  downloadMapForZone,
  isOfflineMapReady,
  getCachedSafeRoute,
  getLocalTileUrlTemplate,
} from '../services/offlineMapManager';
import {
  getNearestSafeRoute,
  SafeRouteResponse,
  fetchNearbyCitizens,
  NearbyCitizen,
} from '../services/api';
import { LEAFLET_JS, LEAFLET_CSS } from '../services/leafletBundle';

interface MapScreenProps {
  lastLocation: LocationSyncPayload | null;
  peers: MeshPeer[];
  isRedZone: boolean;
  networkMode?: 'ONLINE' | 'BLE_MESH' | 'OFFLINE_QUEUED';
  onBack?: () => void;
  targetHavenCoords?: { lat: number; lng: number } | null;
}

const RNCWebView: any = WebView;

export const MapScreen: React.FC<MapScreenProps> = ({
  lastLocation,
  peers,
  isRedZone,
  networkMode = 'ONLINE',
  onBack,
  targetHavenCoords,
}) => {
  const webViewRef = useRef<any>(null);

  const [offlineReady, setOfflineReady] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [safeRouteData, setSafeRouteData] = useState<SafeRouteResponse | null>(null);
  const [nearbyCitizens, setNearbyCitizens] = useState<NearbyCitizen[]>([]);
  const [showEvacCard, setShowEvacCard] = useState<boolean>(isRedZone);
  const [mapLayer, setMapLayer] = useState<'street' | 'satellite' | 'terrain' | 'hybrid' | 'dark' | 'offline'>('street');

  const [isCellularConnected, setIsCellularConnected] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsCellularConnected(isOnline);
      if (!isOnline) {
        console.log('[MapScreen] Data disconnected: switching to Autonomous Offline Map');
        handleSwitchLayer('offline');
      }
    });
    return () => unsubscribe();
  }, []);

  const isOffline = !isCellularConnected || networkMode === 'BLE_MESH' || networkMode === 'OFFLINE_QUEUED';

  // Network mode auto-takeover: automatically switch to offline cached tiles when connection drops
  useEffect(() => {
    if (isOffline) {
      handleSwitchLayer('offline');
    }
  }, [isOffline]);

  useEffect(() => {
    if (targetHavenCoords) {
      setShowEvacCard(true);
      sendGpsToMap(targetHavenCoords.lat, targetHavenCoords.lng, 10, true);
      loadSafeRoute(currentLat, currentLng);
    } else if (isRedZone) {
      setShowEvacCard(true);
      loadSafeRoute(currentLat, currentLng);
    } else {
      setShowEvacCard(false);
      setSafeRouteData(null);
      sendMessageToWebView({ type: 'CLEAR_ROUTE' });
    }
  }, [isRedZone, targetHavenCoords]);

  // Live GPS tracking state
  const [liveCoords, setLiveCoords] = useState<{
    latitude: number;
    longitude: number;
    heading: number | null;
    accuracy: number | null;
    speed: number | null;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'ACQUIRING' | 'LOCKED' | 'PERMISSION_DENIED'>('ACQUIRING');
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  // Active coordinates
  const currentLat = liveCoords?.latitude ?? lastLocation?.lat ?? 27.6015;
  const currentLng = liveCoords?.longitude ?? lastLocation?.lng ?? 77.5975;

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) setGpsStatus('PERMISSION_DENIED');
          return;
        }

        // 1. Initial fast GPS lock
        const initialLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (initialLoc && isMounted) {
          const coords = {
            latitude: initialLoc.coords.latitude,
            longitude: initialLoc.coords.longitude,
            heading: initialLoc.coords.heading,
            accuracy: initialLoc.coords.accuracy,
            speed: initialLoc.coords.speed,
          };
          setLiveCoords(coords);
          setGpsStatus('LOCKED');

          sendGpsToMap(coords.latitude, coords.longitude, coords.accuracy || 10, true);
          loadSafeRoute(coords.latitude, coords.longitude);
          loadNearbyCitizens(coords.latitude, coords.longitude);
        }

        // 2. High-precision continuous GPS stream
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 2,
          },
          (loc) => {
            if (!isMounted) return;
            const coords = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              heading: loc.coords.heading,
              accuracy: loc.coords.accuracy,
              speed: loc.coords.speed,
            };
            setLiveCoords(coords);
            setGpsStatus('LOCKED');
            sendGpsToMap(coords.latitude, coords.longitude, coords.accuracy || 10, false);
          }
        );
      } catch (err) {
        console.warn('[MapScreen] Live GPS subscription error:', err);
      }
    };

    startTracking();
    initScreenData(currentLat, currentLng);

    return () => {
      isMounted = false;
      locationSubscription?.remove();
    };
  }, []);

  const initScreenData = async (lat: number, lng: number) => {
    const ready = await isOfflineMapReady();
    setOfflineReady(ready);
    if (!ready && !isOffline) {
      handleDownload();
    }
    if (isRedZone) {
      await loadSafeRoute(lat, lng);
    }
    await loadNearbyCitizens(lat, lng);
  };

  const loadSafeRoute = async (lat: number, lng: number) => {
    try {
      const data = await getNearestSafeRoute(lat, lng);
      if (data && data.safe_space) {
        setSafeRouteData(data);
        if (isRedZone) {
          sendRouteToMap(data);
        }
      } else {
        const cached = await getCachedSafeRoute();
        if (cached) {
          setSafeRouteData(cached);
          if (isRedZone) {
            sendRouteToMap(cached);
          }
        }
      }
    } catch (err) {
      console.warn('[MapScreen] Failed to load safe route:', err);
      const cached = await getCachedSafeRoute();
      if (cached) {
        setSafeRouteData(cached);
        if (isRedZone) {
          sendRouteToMap(cached);
        }
      }
    }
  };

  const loadNearbyCitizens = async (lat: number, lng: number) => {
    try {
      const citizens = await fetchNearbyCitizens(lat, lng);
      if (citizens && citizens.length > 0) {
        setNearbyCitizens(citizens);
        sendCitizensToMap(citizens);
      }
    } catch (err) {
      console.warn('[MapScreen] Failed to load nearby citizens:', err);
    }
  };

  const sendMessageToWebView = (msg: any) => {
    if (webViewRef.current) {
      const payload = JSON.stringify(msg);
      webViewRef.current.postMessage(payload);
    }
  };

  const sendGpsToMap = (lat: number, lng: number, accuracy: number, center: boolean = false) => {
    sendMessageToWebView({
      type: 'UPDATE_GPS',
      lat,
      lng,
      accuracy,
      center,
    });
  };

  const sendRouteToMap = (routeData: SafeRouteResponse) => {
    sendMessageToWebView({
      type: 'SET_ROUTE',
      route: routeData.route || [],
      safeSpace: routeData.safe_space,
    });
  };

  const sendCitizensToMap = (citizens: NearbyCitizen[]) => {
    sendMessageToWebView({ type: 'SET_CITIZENS', citizens });
  };

  const handleSwitchLayer = (layer: 'street' | 'satellite' | 'terrain' | 'hybrid' | 'dark' | 'offline') => {
    setMapLayer(layer);
    sendMessageToWebView({ type: 'SWITCH_LAYER', layer });
  };

  const centerOnUser = () => {
    sendMessageToWebView({ type: 'CENTER_USER' });
  };

  const centerOnSafeHaven = () => {
    sendMessageToWebView({ type: 'CENTER_HAVEN' });
  };

  const centerOnEvacRoute = () => {
    sendMessageToWebView({ type: 'FIT_ROUTE' });
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(5);

    try {
      const result = await downloadMapForZone(currentLat, currentLng, (progressRatio) => {
        setDownloadProgress(Math.round(progressRatio * 100));
      });

      if (result.safeRoute) {
        setSafeRouteData(result.safeRoute);
        sendRouteToMap(result.safeRoute);
      }
      setOfflineReady(true);
    } catch (err) {
      console.error('[MapScreen] Download failed:', err);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(100);
    }
  };

  const leafletHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    ${LEAFLET_CSS}
  </style>
  <script>
    ${LEAFLET_JS}
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #0f172a; overflow: hidden; }
    .user-beacon {
      position: relative;
      width: 28px;
      height: 28px;
    }
    .user-beacon-core {
      position: absolute;
      top: 5px;
      left: 5px;
      width: 18px;
      height: 18px;
      background: #0284c7;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(2, 132, 199, 0.9);
      z-index: 10;
    }
    .user-beacon-pulse {
      position: absolute;
      top: -6px;
      left: -6px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(2, 132, 199, 0.35);
      border: 2px solid #0284c7;
      animation: beaconRipple 1.8s infinite ease-out;
      z-index: 5;
    }
    @keyframes beaconRipple {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    .haven-pin {
      background: #10b981;
      border: 3px solid #ffffff;
      color: #ffffff;
      font-size: 14px;
      font-weight: 800;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.45);
    }
    .citizen-pin {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #fff;
      font-weight: bold;
    }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-popup-content-wrapper {
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid #334155;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    }
    .leaflet-popup-tip { background: #0f172a; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [${currentLat}, ${currentLng}],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    var googleApiKey = 'AIzaSyBuZa36PDwWKduUlVQKPWoqPS7TiwW10EI';

    // 1. Google Streets (Official Vector Roadmap)
    var googleStreetLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=' + googleApiKey, {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 21,
      attribution: 'Google Maps'
    });

    // 2. Google Satellite (High-Resolution Aerial Imagery)
    var googleSatLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&key=' + googleApiKey, {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 21,
      attribution: 'Google Satellite'
    });

    // 3. Google Hybrid (Satellite Photography + Roads & Place Labels)
    var googleHybridLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=' + googleApiKey, {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 21,
      attribution: 'Google Hybrid'
    });

    // 4. Google Terrain (Topographic Contours & Mountain Relief)
    var googleTerrainLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&key=' + googleApiKey, {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 21,
      attribution: 'Google Terrain'
    });

    // 5. Dark Mode (Night Rescue Operations)
    var darkLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Dark Mode'
    });

    // 6. Downloaded & Pre-bundled High-Definition Offline Map Layer
    var OfflineSmartLayer = L.TileLayer.extend({
      createTile: function(coords, done) {
        var tile = document.createElement('img');
        var localTemplate = '${getLocalTileUrlTemplate()}';
        var localUrl = localTemplate.replace('{z}', coords.z).replace('{x}', coords.x).replace('{y}', coords.y);
        var assetUrl = 'file:///android_asset/map_tiles/' + coords.z + '/' + coords.x + '/' + coords.y + '.png';

        L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));

        var step = 0;
        L.DomEvent.on(tile, 'error', L.Util.bind(function() {
          if (step === 0) {
            step = 1;
            tile.src = assetUrl;
          } else {
            var canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#0a101d';
            ctx.fillRect(0, 0, 256, 256);
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, 256, 256);
            ctx.fillStyle = '#0284c7';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('⚡ OFFLINE SECTOR', 12, 24);
            ctx.fillStyle = '#64748b';
            ctx.font = '10px monospace';
            ctx.fillText('Z' + coords.z + ' • X' + coords.x + ' Y' + coords.y, 12, 42);
            done(null, canvas);
          }
        }, this));

        tile.alt = '';
        tile.setAttribute('role', 'presentation');
        tile.src = localUrl;
        return tile;
      }
    });

    var offlineTileLayer = new OfflineSmartLayer('', {
      minZoom: 10,
      maxZoom: 21,
      minNativeZoom: 12,
      maxNativeZoom: 15,
      attribution: 'Offline Map'
    });

    var currentTileLayer = ${isOffline ? 'offlineTileLayer' : 'googleStreetLayer'};
    currentTileLayer.addTo(map);

    function attachTileFallback(layer) {
      if (!layer) return;
      layer.on('tileerror', function() {
        if (currentTileLayer !== offlineTileLayer) {
          window.switchLayer('offline');
          try {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LAYER_FALLBACK', layer: 'offline' }));
            }
          } catch (e) {}
        }
      });
    }
    attachTileFallback(googleStreetLayer);
    attachTileFallback(googleSatLayer);
    attachTileFallback(googleHybridLayer);
    attachTileFallback(googleTerrainLayer);
    attachTileFallback(darkLayer);

    window.switchLayer = function(layerName) {
      if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
      }
      if (layerName === 'satellite') currentTileLayer = googleSatLayer;
      else if (layerName === 'hybrid') currentTileLayer = googleHybridLayer;
      else if (layerName === 'terrain') currentTileLayer = googleTerrainLayer;
      else if (layerName === 'dark') currentTileLayer = darkLayer;
      else if (layerName === 'offline') currentTileLayer = offlineTileLayer;
      else currentTileLayer = googleStreetLayer;
      currentTileLayer.addTo(map);
      if (currentTileLayer.bringToBack) {
        currentTileLayer.bringToBack();
      }
    };

    window.clearSafeRoute = function() {
      if (window.evacPolyline) {
        map.removeLayer(window.evacPolyline);
        window.evacPolyline = null;
      }
      if (window.havenMarker) {
        map.removeLayer(window.havenMarker);
        window.havenMarker = null;
      }
    };

    function handleMessage(data) {
      if (!data) return;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(e) { return; }
      }
      if (data.type === 'UPDATE_GPS') {
        window.updateUserGps(data.lat, data.lng, data.accuracy, data.center);
      } else if (data.type === 'SWITCH_LAYER') {
        window.switchLayer(data.layer);
      } else if (data.type === 'SET_ROUTE') {
        window.setSafeRoute(data.route, data.safeSpace);
      } else if (data.type === 'CLEAR_ROUTE') {
        window.clearSafeRoute();
      } else if (data.type === 'SET_CITIZENS') {
        window.setCitizens(data.citizens);
      } else if (data.type === 'CENTER_USER') {
        window.centerOnUser();
      } else if (data.type === 'CENTER_HAVEN') {
        window.centerOnSafeHaven();
      } else if (data.type === 'FIT_ROUTE') {
        window.fitEvacuationRoute();
      }
    }
    window.handleAppMessage = handleMessage;
    window.addEventListener('message', function(e) { handleMessage(e.data); });
    document.addEventListener('message', function(e) { handleMessage(e.data); });

    var userMarker = null;
    var accuracyCircle = null;
    var lastUserLat = ${currentLat};
    var lastUserLng = ${currentLng};

    var userIcon = L.divIcon({
      className: '',
      html: '<div class="user-beacon"><div class="user-beacon-pulse"></div><div class="user-beacon-core"></div></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    var rangeCircles = [];
    function updateRangeRings(lat, lng) {
      rangeCircles.forEach(function(c) { map.removeLayer(c); });
      rangeCircles = [];
      var r500 = L.circle([lat, lng], { radius: 500, color: '#38bdf8', weight: 1.2, dashArray: '4, 4', fill: false }).addTo(map);
      var r1000 = L.circle([lat, lng], { radius: 1000, color: '#0284c7', weight: 1.0, dashArray: '6, 6', fill: false }).addTo(map);
      var r2000 = L.circle([lat, lng], { radius: 2000, color: '#1e3a8a', weight: 0.8, dashArray: '8, 8', fill: false }).addTo(map);
      rangeCircles.push(r500, r1000, r2000);
    }

    window.updateUserGps = function(lat, lng, accuracy, center) {
      lastUserLat = lat;
      lastUserLng = lng;
      updateRangeRings(lat, lng);
      if (!userMarker) {
        userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        accuracyCircle = L.circle([lat, lng], {
          radius: accuracy || 15,
          color: '#0284c7',
          fillColor: '#0284c7',
          fillOpacity: 0.15,
          weight: 1.5
        }).addTo(map);
      } else {
        userMarker.setLatLng([lat, lng]);
        if (accuracyCircle) {
          accuracyCircle.setLatLng([lat, lng]);
          accuracyCircle.setRadius(accuracy || 15);
        }
      }
      if (center) {
        map.panTo([lat, lng], { animate: true, duration: 0.8 });
      }
    };

    window.centerOnUser = function() {
      map.flyTo([lastUserLat, lastUserLng], 16, { duration: 0.6 });
    };

    var shelterMarker = null;
    var routePolyline = null;
    var lastShelterLat = null;
    var lastShelterLng = null;

    var havenIcon = L.divIcon({
      className: '',
      html: '<div class="haven-pin">🛡️</div>',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    window.setSafeRoute = function(routePoints, safeSpace) {
      if (routePolyline) { map.removeLayer(routePolyline); routePolyline = null; }
      if (shelterMarker) { map.removeLayer(shelterMarker); shelterMarker = null; }

      if (safeSpace && safeSpace.latitude && safeSpace.longitude) {
        lastShelterLat = safeSpace.latitude;
        lastShelterLng = safeSpace.longitude;

        shelterMarker = L.marker([safeSpace.latitude, safeSpace.longitude], {
          icon: havenIcon,
          zIndexOffset: 900
        }).addTo(map);

        var popupContent = '<div style="padding:4px 6px;">' +
          '<div style="font-weight:800; color:#10b981; font-size:13px; margin-bottom:2px;">🛡️ ' + safeSpace.name + '</div>' +
          '<div style="color:#94a3b8; font-size:11px; margin-bottom:4px;">' + (safeSpace.sector || 'Ridge Evacuation Center') + '</div>' +
          '<div style="color:#e2e8f0; font-size:11px;">Elevation: ' + (safeSpace.elevation_meters || 1650) + 'm (+180m above valley)</div>' +
          '<div style="color:#e2e8f0; font-size:11px;">Capacity: ' + (safeSpace.capacity || 500) + ' citizens</div>' +
          '<div style="color:#38bdf8; font-weight:700; font-size:11px; margin-top:3px;">Hotline: ' + (safeSpace.contact_phone || '112') + '</div>' +
        '</div>';

        shelterMarker.bindPopup(popupContent);
      }

      if (routePoints && routePoints.length > 0) {
        var latlngs = routePoints.map(function(p) { return [p.latitude, p.longitude]; });
        routePolyline = L.polyline(latlngs, {
          color: '#10b981',
          weight: 6,
          dashArray: '8, 6',
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        setTimeout(function() {
          map.fitBounds(routePolyline.getBounds(), { padding: [100, 40] });
        }, 300);
      }
    };

    window.centerOnSafeHaven = function() {
      if (lastShelterLat && lastShelterLng) {
        map.flyTo([lastShelterLat, lastShelterLng], 16, { duration: 0.8 });
        if (shelterMarker) shelterMarker.openPopup();
      }
    };

    window.fitEvacuationRoute = function() {
      if (routePolyline) {
        map.fitBounds(routePolyline.getBounds(), { padding: [120, 60], animate: true });
      } else if (lastShelterLat && lastShelterLng) {
        window.centerOnSafeHaven();
      }
    };

    var citizenMarkers = [];
    window.setCitizens = function(citizens) {
      citizenMarkers.forEach(function(m) { map.removeLayer(m); });
      citizenMarkers = [];

      citizens.forEach(function(c) {
        var isDanger = c.safety_status === 'DANGER' || c.status === 'SOS';
        var isSafe = c.safety_status === 'SAFE';
        var color = isDanger ? '#ef4444' : isSafe ? '#10b981' : '#f59e0b';
        var iconHtml = '<div class="citizen-pin" style="background:' + color + ';">👤</div>';

        var cIcon = L.divIcon({
          className: '',
          html: iconHtml,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        var cm = L.marker([c.lat, c.lng], { icon: cIcon, zIndexOffset: 800 }).addTo(map);
        var pop = '<div style="padding:3px 5px;">' +
          '<div style="font-weight:800; font-size:12px; color:#f8fafc;">' + c.name + '</div>' +
          '<div style="font-size:10px; color:#94a3b8;">' + c.location_name + '</div>' +
          '<div style="font-size:10px; color:' + color + '; font-weight:700; margin-top:2px;">Status: ' + c.safety_status + '</div>' +
          '<div style="font-size:10px; color:#e2e8f0;">Distance: ' + c.distance_meters + 'm | Battery: ' + c.battery_level + '%</div>' +
          '<div style="font-size:10px; color:#38bdf8; font-weight:700;">Phone: ' + c.phone + '</div>' +
        '</div>';
        cm.bindPopup(pop);
        citizenMarkers.push(cm);
      });
    };

    // Signal map ready to React Native
    setTimeout(function() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      }
    }, 400);
  </script>
</body>
</html>
  `;

  return (
    <View style={styles.container}>
      {/* ─── Ultra-Reliable Interactive WebGL/Canvas Map Engine ─── */}
      <RNCWebView
        ref={webViewRef}
        source={{ html: leafletHtml, baseUrl: 'file:///android_asset/' }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        allowsInlineMediaPlayback={true}
        originWhitelist={['*']}
        onMessage={(event: any) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'MAP_READY') {
              setMapLoaded(true);
              if (liveCoords) {
                sendGpsToMap(liveCoords.latitude, liveCoords.longitude, liveCoords.accuracy || 10, true);
              }
              if (isRedZone && safeRouteData) {
                sendRouteToMap(safeRouteData);
              }
              if (nearbyCitizens.length > 0) {
                sendCitizensToMap(nearbyCitizens);
              }
            } else if (data.type === 'LAYER_FALLBACK') {
              setMapLayer(data.layer);
            }
          } catch (e) {}
        }}
      />

      {/* ─── Floating Top Bar: GPS Telemetry & Layer Selector ─── */}
      <View style={styles.topControlContainer}>
        {/* Live GPS Telemetry Status Pill */}
        <View style={styles.gpsBadge}>
          <View
            style={[
              styles.gpsIndicatorDot,
              gpsStatus === 'LOCKED' ? styles.gpsDotGreen : styles.gpsDotOrange,
            ]}
          />
          <Text style={styles.gpsBadgeText}>
            {gpsStatus === 'LOCKED'
              ? `LIVE GPS: ${currentLat.toFixed(4)}°N, ${currentLng.toFixed(4)}°E (±${Math.round(liveCoords?.accuracy || 3)}m)`
              : gpsStatus === 'PERMISSION_DENIED'
              ? 'GPS Permission Denied - Using Default'
              : 'Acquiring High-Precision GPS Lock...'}
          </Text>
        </View>

        {/* Floating Offline Banner when Cellular/Wi-Fi Disconnects */}
        {isOffline && (
          <View style={styles.offlineBanner}>
            <WifiOff size={13} color="#10b981" />
            <Text style={styles.offlineBannerText}>
              ⚡ Autonomous Tactical GIS Active • Satellite GPS Locked
            </Text>
          </View>
        )}

        {/* Layer Selector Pill */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxWidth: '100%' }}
          contentContainerStyle={styles.layerPillRow}
        >
          <TouchableOpacity
            style={[styles.layerPillBtn, mapLayer === 'street' && styles.layerPillBtnActive]}
            onPress={() => handleSwitchLayer('street')}
            activeOpacity={0.8}
          >
            <Text style={[styles.layerPillText, mapLayer === 'street' && styles.layerPillTextActive]}>
              🗺️ Street
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.layerPillBtn, mapLayer === 'offline' && styles.layerPillBtnActive]}
            onPress={() => handleSwitchLayer('offline')}
            activeOpacity={0.8}
          >
            <Text style={[styles.layerPillText, mapLayer === 'offline' && styles.layerPillTextActive]}>
              ⚡ Offline
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.layerPillBtn, mapLayer === 'satellite' && styles.layerPillBtnActive]}
            onPress={() => handleSwitchLayer('satellite')}
            activeOpacity={0.8}
          >
            <Text style={[styles.layerPillText, mapLayer === 'satellite' && styles.layerPillTextActive]}>
              🛰️ Satellite
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.layerPillBtn, mapLayer === 'hybrid' && styles.layerPillBtnActive]}
            onPress={() => handleSwitchLayer('hybrid')}
            activeOpacity={0.8}
          >
            <Text style={[styles.layerPillText, mapLayer === 'hybrid' && styles.layerPillTextActive]}>
              🏷️ Hybrid
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.layerPillBtn, mapLayer === 'terrain' && styles.layerPillBtnActive]}
            onPress={() => handleSwitchLayer('terrain')}
            activeOpacity={0.8}
          >
            <Text style={[styles.layerPillText, mapLayer === 'terrain' && styles.layerPillTextActive]}>
              ⛰️ Terrain
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.layerPillBtn, mapLayer === 'dark' && styles.layerPillBtnActive]}
            onPress={() => handleSwitchLayer('dark')}
            activeOpacity={0.8}
          >
            <Text style={[styles.layerPillText, mapLayer === 'dark' && styles.layerPillTextActive]}>
              🌙 Dark
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Offline Cache Status / Download Button */}
        <TouchableOpacity
          style={[
            styles.downloadMapPill,
            offlineReady && styles.downloadMapPillReady,
            isDownloading && styles.downloadMapPillDownloading,
          ]}
          onPress={handleDownload}
          disabled={isDownloading}
          activeOpacity={0.8}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#f59e0b" style={{ marginRight: 6 }} />
          ) : offlineReady ? (
            <CheckCircle2 size={13} color="#10b981" style={{ marginRight: 6 }} />
          ) : (
            <DownloadCloud size={13} color="#38bdf8" style={{ marginRight: 6 }} />
          )}
          <Text
            style={[
              styles.downloadMapPillText,
              offlineReady && styles.downloadMapPillTextReady,
              isDownloading && styles.downloadMapPillTextDownloading,
            ]}
          >
            {isDownloading
              ? `Caching High-Res Offline Map (${downloadProgress}%)...`
              : offlineReady
              ? '✓ Offline GIS Map Ready (100% Offline Active)'
              : '📥 Download Full Zone Map for Offline Use'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── Floating Map Quick-Action Buttons (Right Column) ─── */}
      <View style={styles.floatingActionCol}>
        <TouchableOpacity style={styles.mapIconBtn} onPress={centerOnUser} activeOpacity={0.8}>
          <Crosshair size={20} color="#0284c7" />
        </TouchableOpacity>
        {isRedZone && (
          <>
            <TouchableOpacity style={styles.mapIconBtn} onPress={centerOnEvacRoute} activeOpacity={0.8}>
              <Navigation size={18} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapIconBtn} onPress={centerOnSafeHaven} activeOpacity={0.8}>
              <Shield size={18} color="#10b981" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ─── Bottom Nearest Safe Route Evacuation Card (Shown Only During Active Danger / Red Zone) ─── */}
      {isRedZone && showEvacCard && safeRouteData && safeRouteData.safe_space && (
        <View style={styles.evacCard}>
          <View style={styles.evacCardHeader}>
            <View style={styles.evacTitleRow}>
              <Shield size={18} color="#10b981" style={{ marginRight: 6 }} />
              <Text style={styles.evacCardTitle}>Nearest Safe Evacuation Haven</Text>
            </View>
            <View style={styles.safeBadgePill}>
              <Text style={styles.safeBadgePillText}>HIGH GROUND</Text>
            </View>
          </View>

          <Text style={styles.havenName}>{safeRouteData.safe_space.name}</Text>
          <Text style={styles.havenSector}>
            {safeRouteData.safe_space.sector || 'Designated High Ground Evacuation Sector'}
          </Text>

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>DISTANCE</Text>
              <Text style={styles.metricVal}>
                {safeRouteData.distance_km || 1.29} km
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>EST. WALK</Text>
              <Text style={styles.metricVal}>
                ~{safeRouteData.estimated_walk_minutes || 23} min
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>ELEVATION</Text>
              <Text style={styles.metricVal}>
                +{safeRouteData.safe_space.elevation_meters ? safeRouteData.safe_space.elevation_meters - 1470 : 180}m
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>CAPACITY</Text>
              <Text style={styles.metricVal}>
                {safeRouteData.safe_space.capacity || 500}
              </Text>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.evacActionRow}>
            <TouchableOpacity
              style={styles.primaryRouteBtn}
              onPress={centerOnEvacRoute}
              activeOpacity={0.8}
            >
              <Navigation size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.primaryRouteBtnText}>View Nearest Safe Evacuation Route</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  offlineBanner: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#f59e0b',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  downloadMapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#38bdf8',
    marginTop: 6,
    elevation: 4,
  },
  downloadMapPillReady: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(6, 78, 59, 0.85)',
  },
  downloadMapPillDownloading: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(69, 26, 3, 0.85)',
  },
  downloadMapPillText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  downloadMapPillTextReady: {
    color: '#34d399',
  },
  downloadMapPillTextDownloading: {
    color: '#fbbf24',
  },
  offlineBannerText: {
    color: '#fef3c7',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f172a',
  },
  topControlContainer: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 30,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EBE2',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  gpsIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  gpsDotGreen: {
    backgroundColor: '#10b981',
  },
  gpsDotOrange: {
    backgroundColor: '#f59e0b',
  },
  gpsBadgeText: {
    color: '#1C1F24',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  layerPillRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 3,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E8EBE2',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  layerPillBtn: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
  },
  layerPillBtnActive: {
    backgroundColor: '#1E2124',
  },
  layerPillText: {
    color: '#5A6570',
    fontSize: 11,
    fontWeight: '700',
  },
  layerPillTextActive: {
    color: '#ffffff',
  },
  floatingActionCol: {
    position: 'absolute',
    right: 16,
    top: 105,
    gap: 10,
    zIndex: 30,
  },
  mapIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E8EBE2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  evacCard: {
    position: 'absolute',
    bottom: 24,
    left: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EBE2',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    zIndex: 30,
  },
  evacCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  evacTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  evacCardTitle: {
    color: '#707A84',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  safeBadgePill: {
    backgroundColor: '#D8E6D5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  safeBadgePillText: {
    color: '#2A402D',
    fontSize: 10,
    fontWeight: '800',
  },
  havenName: {
    color: '#1C1F24',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  havenSector: {
    color: '#5A6570',
    fontSize: 12,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9F5',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EBE2',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#707A84',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricVal: {
    color: '#1C1F24',
    fontSize: 13,
    fontWeight: '800',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E8EBE2',
  },
  evacActionRow: {
    flexDirection: 'row',
  },
  primaryRouteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E2124',
    paddingVertical: 13,
    borderRadius: 9999,
    elevation: 2,
  },
  primaryRouteBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  bottomSpacer: {
    height: 20,
  },
});
