import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Text as SvgText, G } from 'react-native-svg';
import { Plus, Minus, MoreVertical, Radio, MapPin } from 'lucide-react-native';
import { MapClusterMarker } from '../types';

interface MapSessionCardProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export const MapSessionCard: React.FC<MapSessionCardProps> = ({ onZoomIn, onZoomOut }) => {
  const markers: MapClusterMarker[] = [
    { id: '1', number: 1, lat: 30.55, lng: 79.56, xPercent: 32, yPercent: 42, active: true, label: 'Chamoli Head' },
    { id: '6', number: 6, lat: 30.58, lng: 79.52, xPercent: 28, yPercent: 65, active: false, label: 'Joshimath Node' },
    { id: '4', number: 4, lat: 30.74, lng: 79.49, xPercent: 52, yPercent: 78, active: false, label: 'Badrinath Relay' },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.cardHeaderTitle}>Map Session</Text>

      {/* Map Graphic Canvas Container */}
      <View style={styles.mapCanvas}>
        {/* Stylized Contour & World / Region Map Lines */}
        <Svg width="100%" height={170} viewBox="0 0 320 170">
          <G opacity={0.35}>
            {/* World / Himalayan terrain stylized path */}
            <Path
              d="M20 40 Q 50 20 80 45 T 140 30 T 200 60 T 260 40 T 300 70 L 300 150 L 20 150 Z"
              fill="#e2e8f0"
            />
            <Path
              d="M10 80 Q 40 60 70 85 T 130 70 T 190 100 T 250 80 L 310 120"
              stroke="#cbd5e1"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="4 4"
            />
            <Path
              d="M140 10 Q 180 30 220 15 T 280 50"
              stroke="#94a3b8"
              strokeWidth="1"
              fill="none"
            />
          </G>

          {/* Active Highlighted Location Pin (Chamoli France / India Pin) */}
          <G transform="translate(195, 62)">
            <Circle r="6" fill="#f59e0b" />
            <Circle r="12" fill="#f59e0b" opacity={0.3} />
          </G>

          {/* Numbered Map Pins */}
          {markers.map((m) => (
            <G key={m.id} transform={`translate(${m.xPercent * 2.8}, ${m.yPercent * 1.5})`}>
              <Circle r="10" fill="#f59e0b" />
              <SvgText
                x="0"
                y="4"
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                {m.number}
              </SvgText>
            </G>
          ))}
        </Svg>

        {/* Floating Map Zoom Controls matching mockup */}
        <View style={styles.zoomControls}>
          <TouchableOpacity style={styles.zoomBtn} onPress={onZoomIn} activeOpacity={0.7}>
            <Plus size={16} color="#334155" />
          </TouchableOpacity>
          <View style={styles.zoomDivider} />
          <TouchableOpacity style={styles.zoomBtn} onPress={onZoomOut} activeOpacity={0.7}>
            <Minus size={16} color="#334155" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer Device / Relay Node Pill matching mockup bottom footer */}
      <View style={styles.footerDeviceCard}>
        <View style={styles.deviceIconBox}>
          <Radio size={20} color="#f59e0b" />
        </View>

        <View style={styles.deviceInfoContainer}>
          <View style={styles.deviceTitleRow}>
            <Text style={styles.deviceTitle}>NeerNetra Station Alpha</Text>
            <TouchableOpacity style={styles.moreBtn} activeOpacity={0.6}>
              <MoreVertical size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.deviceSubText}>Version GLOF-v2.4 • High Priority Node</Text>

          <View style={styles.locationMetaRow}>
            <Text style={styles.flagText}>🇮🇳 Chamoli, India</Text>
            <Text style={styles.timeText}>Sep 12, 13:00</Text>
          </View>
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
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  cardHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  mapCanvas: {
    height: 170,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  zoomControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  zoomBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    width: '100%',
  },
  footerDeviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  deviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fffbe6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  deviceInfoContainer: {
    flex: 1,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  moreBtn: {
    padding: 2,
  },
  deviceSubText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  locationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  flagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  timeText: {
    fontSize: 10,
    color: '#94a3b8',
  },
});
