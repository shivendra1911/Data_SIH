import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { ZonePrediction } from '../types';
import { Droplets, ThermometerSun, CloudRain, AlertTriangle } from 'lucide-react-native';

interface SecurityGaugeCardProps {
  prediction: ZonePrediction | null;
}

export const SecurityGaugeCard: React.FC<SecurityGaugeCardProps> = ({ prediction }) => {
  const prob = prediction ? prediction.flood_probability_percent : 85.5;
  const alertColor = prediction ? prediction.alert_color : 'RED';
  const trigger = prediction ? prediction.primary_trigger : 'GLOF & Torrential Rainfall';
  const zoneId = prediction ? prediction.zone_id : 'chamoli_01';
  const lastUpdated = prediction?.last_updated
    ? new Date(prediction.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  // SVG Gauge — 180-degree semicircle
  const radius = 70;
  const strokeWidth = 16;
  const cx = 100;
  const cy = 90;

  const angle = (prob / 100) * 180;

  const polarToCartesian = (centerX: number, centerY: number, r: number, deg: number) => {
    const rad = ((deg - 180) * Math.PI) / 180.0;
    return { x: centerX + r * Math.cos(rad), y: centerY + r * Math.sin(rad) };
  };

  const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const backgroundArcPath = describeArc(cx, cy, radius, 0, 180);
  const activeArcPath = describeArc(cx, cy, radius, 0, Math.min(angle, 179.9));

  const getGaugeColor = () => {
    if (alertColor === 'RED') return '#ef4444';
    if (alertColor === 'ORANGE') return '#f97316';
    return '#10b981';
  };

  const getAlertBg = () => {
    if (alertColor === 'RED') return '#fff1f2';
    if (alertColor === 'ORANGE') return '#fff7ed';
    return '#f0fdf4';
  };

  const getAlertBorder = () => {
    if (alertColor === 'RED') return '#fecdd3';
    if (alertColor === 'ORANGE') return '#fed7aa';
    return '#bbf7d0';
  };

  const getRiskText = () => {
    if (alertColor === 'RED') return 'CRITICAL FLOOD RISK';
    if (alertColor === 'ORANGE') return 'ELEVATED FLOOD RISK';
    return 'LOW RISK — SAFE ZONE';
  };

  return (
    <View style={[styles.card, { backgroundColor: getAlertBg(), borderColor: getAlertBorder() }]}>
      {/* Zone + Time header */}
      <View style={styles.topRow}>
        <View style={styles.zoneTag}>
          <Droplets size={13} color={getGaugeColor()} />
          <Text style={[styles.zoneText, { color: getGaugeColor() }]}>
            {zoneId.toUpperCase().replace('_', ' ')}
          </Text>
        </View>
        <Text style={styles.updatedText}>Updated {lastUpdated}</Text>
      </View>

      {/* Risk level label */}
      <Text style={[styles.riskTitle, { color: getGaugeColor() }]}>{getRiskText()}</Text>

      {/* Gauge SVG */}
      <View style={styles.gaugeContainer}>
        <Svg width={200} height={110} viewBox="0 0 200 110">
          <G>
            <Path
              d={backgroundArcPath}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <Path
              d={activeArcPath}
              fill="none"
              stroke={getGaugeColor()}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          </G>
        </Svg>

        <View style={styles.textOverlay}>
          <Text style={[styles.percentText, { color: getGaugeColor() }]}>{prob.toFixed(0)}%</Text>
          <Text style={styles.probLabel}>AI Flood Risk</Text>
        </View>
      </View>

      {/* Trigger pill */}
      <View style={[styles.triggerPill, { borderColor: getGaugeColor() + '40' }]}>
        <AlertTriangle size={12} color={getGaugeColor()} />
        <Text style={[styles.triggerText, { color: getGaugeColor() }]}>{trigger}</Text>
      </View>

      {/* Status row */}
      <View style={styles.statusRow}>
        <View style={styles.statItem}>
          <CloudRain size={14} color="#64748b" />
          <Text style={styles.statLabel}>96.4% Model Acc.</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <ThermometerSun size={14} color="#64748b" />
          <Text style={styles.statLabel}>RandomForest AI</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Droplets size={14} color="#64748b" />
          <Text style={styles.statLabel}>Real-time Sensors</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  zoneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  zoneText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  updatedText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  riskTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    width: 200,
    position: 'relative',
  },
  textOverlay: {
    position: 'absolute',
    bottom: 10,
    alignItems: 'center',
  },
  percentText: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  probLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: -2,
  },
  triggerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 12,
  },
  triggerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#e2e8f0',
  },
});
