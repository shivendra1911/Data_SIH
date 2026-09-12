import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, Text as SvgText, G } from 'react-native-svg';
import { MapPin, Navigation, Plus, Minus, Layers, ShieldCheck, AlertOctagon } from 'lucide-react-native';
import { LocationSyncPayload, MeshPeer } from '../types';

interface OfflineMapContainerProps {
  lastLocation: LocationSyncPayload | null;
  peers: MeshPeer[];
  isRedZone: boolean;
}

export const OfflineMapContainer: React.FC<OfflineMapContainerProps> = ({
  lastLocation,
  peers,
  isRedZone,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(14);
  const [showTerrain, setShowTerrain] = useState<boolean>(true);

  const myLat = lastLocation ? lastLocation.lat : 27.6015;
  const myLng = lastLocation ? lastLocation.lng : 77.5975;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Navigation size={18} color="#0284c7" />
          <Text style={styles.title}>OFFLINE MAP & PEER TRACKER</Text>
        </View>

        <TouchableOpacity
          style={styles.layerBtn}
          onPress={() => setShowTerrain(!showTerrain)}
          activeOpacity={0.7}
        >
          <Layers size={14} color="#334155" />
          <Text style={styles.layerText}>{showTerrain ? 'Vector Topo' : 'Contour'}</Text>
        </TouchableOpacity>
      </View>

      {/* Vector Map Canvas */}
      <View style={styles.mapFrame}>
        <Svg width="100%" height={220} viewBox="0 0 340 220">
          {/* Topographic Contour Lines & River Basin */}
          <G opacity={0.4}>
            {/* River Alaknanda vector path */}
            <Path
              d="M10 30 C 80 50, 120 120, 180 140 C 240 160, 290 190, 330 210"
              stroke="#0284c7"
              strokeWidth="5"
              fill="none"
            />
            {/* Elevation Contour Lines */}
            <Path
              d="M 30 10 Q 90 70 160 30 T 290 90"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />
            <Path
              d="M 50 100 Q 120 150 200 110 T 320 170"
              stroke="#cbd5e1"
              strokeWidth="1.2"
              fill="none"
            />
          </G>

          {/* Red Alert Zone Polygon Highlight */}
          {isRedZone && (
            <G opacity={0.25}>
              <Rect x="40" y="30" width="260" height="150" rx="20" fill="#dc2626" />
            </G>
          )}

          {/* Connected Bluetooth Mesh Peers Map Pins */}
          {peers.map((peer, idx) => {
            const px = 70 + idx * 80;
            const py = 60 + (idx % 2) * 50;
            const isSos = peer.status === 'SOS';

            return (
              <G key={peer.id} transform={`translate(${px}, ${py})`}>
                <Circle r="12" fill={isSos ? '#dc2626' : '#2563eb'} opacity={0.2} />
                <Circle r="6" fill={isSos ? '#ef4444' : '#3b82f6'} />
                <SvgText
                  x="0"
                  y="-10"
                  fill="#0f172a"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {peer.name.split(' ')[0]} ({peer.distanceMeters || 100}m)
                </SvgText>
              </G>
            );
          })}

          {/* YOU ARE HERE Marker (Pulsing Amber Pin) */}
          <G transform="translate(170, 110)">
            <Circle r="16" fill="#f59e0b" opacity={0.3} />
            <Circle r="8" fill="#d97706" />
            <Circle r="3" fill="#ffffff" />
            <SvgText x="0" y="24" fill="#78350f" fontSize="11" fontWeight="bold" textAnchor="middle">
              YOU (Last GPS Sync)
            </SvgText>
          </G>
        </Svg>

        {/* Floating Zoom Buttons */}
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() => setZoomLevel(Math.min(18, zoomLevel + 1))}
          >
            <Plus size={16} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() => setZoomLevel(Math.max(10, zoomLevel - 1))}
          >
            <Minus size={16} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Offline Vector Badge */}
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineText}>Cached Vector Tiles • 0 KB Data</Text>
        </View>
      </View>

      {/* GPS Coordinate Footbar */}
      <View style={styles.coordFooter}>
        <View style={styles.coordCol}>
          <Text style={styles.coordLabel}>Latitude / Longitude</Text>
          <Text style={styles.coordValue}>
            {myLat.toFixed(5)}° N, {myLng.toFixed(5)}° E
          </Text>
        </View>
        <View style={styles.coordColRight}>
          <Text style={styles.coordLabel}>Elevation</Text>
          <Text style={styles.coordValue}>{lastLocation ? lastLocation.altitude || 1450 : 1450}m</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  layerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  layerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  mapFrame: {
    height: 220,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  zoomControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  zoomBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  offlineBadge: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  offlineText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '600',
  },
  coordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  coordCol: {
    flex: 1,
  },
  coordColRight: {
    alignItems: 'flex-end',
  },
  coordLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  coordValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
});
