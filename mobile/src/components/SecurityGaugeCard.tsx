import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { ZonePrediction } from '../types';

interface SecurityGaugeCardProps {
  prediction: ZonePrediction | null;
}

export const SecurityGaugeCard: React.FC<SecurityGaugeCardProps> = ({ prediction }) => {
  const prob = prediction ? prediction.flood_probability_percent : 85.5;
  const alertColor = prediction ? prediction.alert_color : 'RED';
  const trigger = prediction ? prediction.primary_trigger : 'GLOF & Torrential Rainfall';

  // SVG Gauge calculations for a 180-degree semi circle
  const radius = 70;
  const strokeWidth = 16;
  const cx = 100;
  const cy = 90;

  // Percentage to angle (0 to 180 degrees)
  const angle = (prob / 100) * 180;
  
  // Convert polar coordinates to Cartesian
  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const backgroundArcPath = describeArc(cx, cy, radius, 0, 180);
  const activeArcPath = describeArc(cx, cy, radius, 0, Math.min(angle, 179.9));

  const getGaugeColor = () => {
    if (alertColor === 'RED') return '#f59e0b'; // Amber yellow matching reference image!
    if (alertColor === 'ORANGE') return '#f97316';
    return '#10b981';
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardHeaderTitle}>Telemetry & Flood Risk</Text>

      <View style={styles.gaugeContainer}>
        <Svg width={200} height={110} viewBox="0 0 200 110">
          <G>
            {/* Dark background track */}
            <Path
              d={backgroundArcPath}
              fill="none"
              stroke="#1e293b"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Active percentage arc */}
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
          <Text style={styles.percentText}>{prob.toFixed(0)}%</Text>
          <Text style={styles.riskLabel}>
            {alertColor === 'RED' ? 'High Flood Risk' : alertColor === 'ORANGE' ? 'Moderate Risk' : 'Normal Risk'}
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.triggerPill}>
          <View style={[styles.dot, { backgroundColor: getGaugeColor() }]} />
          <Text style={styles.triggerText}>{trigger}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    letterSpacing: -0.5,
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
    fontSize: 34,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -1,
  },
  riskLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginTop: -2,
  },
  footerRow: {
    marginTop: 4,
    width: '100%',
    alignItems: 'center',
  },
  triggerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  triggerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
});
