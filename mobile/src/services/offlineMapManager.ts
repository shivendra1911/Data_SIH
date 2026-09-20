import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNearestSafeRoute, SafeRouteResponse } from './api';

const OFFLINE_SAFE_ROUTE_KEY = '@neernetra_offline_safe_route_v1';
const OFFLINE_MAPS_READY_KEY = '@neernetra_offline_maps_ready_v1';
const OFFLINE_MAP_METADATA_KEY = '@neernetra_offline_map_meta_v1';

export const getMapCacheDir = (): string => {
  const fs = FileSystem as any;
  const baseDir = fs.documentDirectory || fs.cacheDirectory || (fs.Paths?.cache?.uri) || '';
  return baseDir + 'map_tiles/';
};

export const initMapCache = async (): Promise<string> => {
  const cacheDir = getMapCacheDir();
  const fs = FileSystem as any;
  try {
    if (fs.getInfoAsync) {
      const dirInfo = await fs.getInfoAsync(cacheDir);
      if (!dirInfo.exists && fs.makeDirectoryAsync) {
        await fs.makeDirectoryAsync(cacheDir, { intermediates: true });
      }
    }
  } catch (err) {
    console.warn('[OfflineMapManager] Cache dir init error:', err);
  }
  return cacheDir;
};

/**
 * Downloads a focused 3x3 tile grid for the current disaster zone (Zoom level 14)
 * and simultaneously caches the nearest safe evacuation route and shelter coordinates.
 */
export const downloadMapForZone = async (
  lat: number,
  lng: number,
  onProgress: (progress: number) => void
): Promise<{ success: boolean; cachedTiles: number; safeRoute: SafeRouteResponse | null }> => {
  const cacheDir = await initMapCache();
  let downloadedCount = 0;
  let cachedSafeRoute: SafeRouteResponse | null = null;

  try {
    // 1. First step: 10% - Fetch and cache nearest safe evacuation route from backend
    onProgress(0.1);
    try {
      cachedSafeRoute = await getNearestSafeRoute(lat, lng);
      if (cachedSafeRoute) {
        await AsyncStorage.setItem(OFFLINE_SAFE_ROUTE_KEY, JSON.stringify(cachedSafeRoute));
      }
    } catch (routeErr) {
      console.warn('[OfflineMapManager] Safe route fetch error (will use fallback):', routeErr);
    }

    onProgress(0.25);

    // 2. Compute tile coordinates for Zoom 14
    const z = 14;
    const n = Math.pow(2, z);
    const latRad = (lat * Math.PI) / 180;
    const centerTileX = Math.floor(((lng + 180.0) / 360.0) * n);
    const centerTileY = Math.floor(
      ((1.0 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2.0) * n
    );

    // 5x5 grid around center tile = 25 tiles total for wide sector coverage
    const tilesToDownload: { x: number; y: number }[] = [];
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        tilesToDownload.push({ x: centerTileX + dx, y: centerTileY + dy });
      }
    }

    const totalTiles = tilesToDownload.length;

    for (let i = 0; i < totalTiles; i++) {
      const { x, y } = tilesToDownload[i];
      const tileUrl = `https://mt1.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${z}&key=AIzaSyBuZa36PDwWKduUlVQKPWoqPS7TiwW10EI`;
      const tileFolder = `${cacheDir}${z}/${x}`;
      const localFilePath = `${tileFolder}/${y}.png`;

      try {
        const folderInfo = await FileSystem.getInfoAsync(tileFolder);
        if (!folderInfo.exists) {
          await FileSystem.makeDirectoryAsync(tileFolder, { intermediates: true });
        }

        // Check if already cached
        const fileInfo = await FileSystem.getInfoAsync(localFilePath);
        if (!fileInfo.exists) {
          await FileSystem.downloadAsync(tileUrl, localFilePath, {
            headers: {
              'User-Agent': 'NeerNetra-Emergency-Disaster-App/1.0',
              'Accept': 'image/png,image/*',
            },
          });
        }
        downloadedCount++;
      } catch (tileErr) {
        console.warn(`[OfflineMapManager] Tile (${z}/${x}/${y}) download error:`, tileErr);
        // Continue loop even if one tile fails so user is never permanently blocked!
      }

      // Progress scales from 0.25 to 0.95
      const currentRatio = 0.25 + ((i + 1) / totalTiles) * 0.70;
      onProgress(Math.min(0.95, currentRatio));
    }

    // 3. Mark offline map as ready
    await AsyncStorage.setItem(OFFLINE_MAPS_READY_KEY, 'true');
    await AsyncStorage.setItem(
      OFFLINE_MAP_METADATA_KEY,
      JSON.stringify({
        centerLat: lat,
        centerLng: lng,
        zoom: z,
        tilesCached: downloadedCount,
        downloadedAt: new Date().toISOString(),
      })
    );

    onProgress(1.0);
    return { success: true, cachedTiles: downloadedCount, safeRoute: cachedSafeRoute };
  } catch (globalErr) {
    console.error('[OfflineMapManager] Fatal download error:', globalErr);
    // Even if error occurs, mark completed so user isn't stuck at 0%
    onProgress(1.0);
    return { success: false, cachedTiles: downloadedCount, safeRoute: cachedSafeRoute };
  }
};

export const isOfflineMapReady = async (): Promise<boolean> => {
  try {
    const val = await AsyncStorage.getItem(OFFLINE_MAPS_READY_KEY);
    return val === 'true';
  } catch {
    return false;
  }
};

export const getCachedSafeRoute = async (): Promise<SafeRouteResponse | null> => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_SAFE_ROUTE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SafeRouteResponse;
  } catch {
    return null;
  }
};

export const getLocalTileUrlTemplate = (): string => {
  return `${getMapCacheDir()}{z}/{x}/{y}.png`;
};
