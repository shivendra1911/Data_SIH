import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertColor, ZonePrediction } from '../types';
import { ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react-native';

interface AlertHeaderProps {
  prediction: ZonePrediction | null;
  loading: boolean;
}

export const AlertHeader: React.FC<AlertHeaderProps> = ({ prediction, loading }) => {
  if (loading || !prediction) {
    return (
      <View style={[styles.container, styles.loadingCard]}>
        <Text style={styles.loadingText}>Connecting to NeerNetra Telemetry...</Text>
      </View>
    );
  }

  const { alert_color, flood_probability_percent, primary_trigger, zone_id } = prediction;

  const getAlertStyles = (color: AlertColor) => {
    switch (color) {
      case 'RED':
        return {
          bg: '#450a0a',
          cardBg: '#7f1d1d',
          border: '#dc2626',
          text: '#fecaca',
          title: 'RED ALERT — HIGH FLOOD RISK',
          Icon: ShieldAlert,
          iconColor: '#ef4444',
        };
      case 'ORANGE':
        return {
          bg: '#431407',
          cardBg: '#7c2d12',
          border: '#ea580c',
          text: '#ffedd5',
          title: 'ORANGE ALERT — MODERATE RISK',
          Icon: AlertTriangle,
          iconColor: '#f97316',
        };
      case 'SAFE':
      default:
        return {
          bg: '#064e3b',
          cardBg: '#065f46',
          border: '#059669',
          text: '#d1fae5',
          title: 'ZONE NORMAL — MONITORING',
          Icon: ShieldCheck,
          iconColor: '#10b981',
        };
    }
  };

  const alertTheme = getAlertStyles(alert_color);
  const IconComponent = alertTheme.Icon;

  return (
    <View style={[styles.container, { backgroundColor: alertTheme.bg, borderColor: alertTheme.border }]}>
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <IconComponent size={24} color={alertTheme.iconColor} />
          <Text style={[styles.alertTitle, { color: alertTheme.text }]}>{alertTheme.title}</Text>
        </View>
        <Text style={styles.zoneTag}>ZONE: {zone_id.toUpperCase()}</Text>
      </View>

      <View style={styles.probRow}>
        <Text style={styles.probLabel}>AI Flood Probability:</Text>
        <Text style={[styles.probVal, { color: alertTheme.iconColor }]}>
          {flood_probability_percent.toFixed(1)}%
        </Text>
      </View>

      <View style={styles.triggerBox}>
        <Text style={styles.triggerLabel}>Primary AI Factor:</Text>
        <Text style={styles.triggerText}>{primary_trigger}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loadingCard: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  zoneTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  probRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  probLabel: {
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '600',
  },
  probVal: {
    fontSize: 32,
    fontWeight: '900',
  },
  triggerBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  triggerLabel: {
    color: '#9ca3af',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  triggerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
});
