import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShieldCheck, Timer, Smartphone, Activity } from 'lucide-react-native';

interface SafeConfirmationCountdownProps {
  remainingSeconds: number;
  onConfirmSafe: () => void;
}

export const SafeConfirmationCountdown: React.FC<SafeConfirmationCountdownProps> = ({
  remainingSeconds,
  onConfirmSafe,
}) => {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.titleRow}>
          <Timer size={18} color="#ef4444" />
          <Text style={styles.title}>RED ZONE SAFETY CHECK (1-MIN INTERVAL)</Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{timeFormatted}</Text>
        </View>
      </View>

      <Text style={styles.warningDesc}>
        Confirm you are safe. If unconfirmed before the 1-minute countdown expires, NeerNetra will{' '}
        <Text style={styles.boldWarning}>automatically alert NDRF of Critical Unresponsive Danger</Text>.
      </Text>

      {/* Touch-Free Screen Damaged Gyro/Motion Backup Notice */}
      <View style={styles.touchFreeNotice}>
        <View style={styles.touchFreeIconBadge}>
          <Smartphone size={18} color="#34d399" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.touchFreeTitle}>TOUCH-FREE GYRO / MOTION SENSOR ACTIVE</Text>
          <Text style={styles.touchFreeSub}>
            Simply <Text style={{ fontWeight: '900', color: '#6ee7b7' }}>lift, tilt, or shake your phone</Text> to automatically confirm <Text style={{ fontWeight: '900', color: '#ffffff' }}>"YES, I AM OKAY"</Text> without touching the screen.
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.safeBtn} onPress={onConfirmSafe} activeOpacity={0.8}>
        <ShieldCheck size={22} color="#ffffff" />
        <Text style={styles.safeBtnText}>YES, I AM OKAY</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#450a0a',
    borderColor: '#dc2626',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#fecaca',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  timerBadge: {
    backgroundColor: '#7f1d1d',
    borderColor: '#ef4444',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  warningDesc: {
    color: '#fee2e2',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  boldWarning: {
    color: '#f87171',
    fontWeight: '800',
  },
  touchFreeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 78, 59, 0.65)',
    borderColor: '#059669',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  touchFreeIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#064e3b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  touchFreeTitle: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  touchFreeSub: {
    color: '#d1fae5',
    fontSize: 11,
    lineHeight: 16,
  },
  safeBtn: {
    backgroundColor: '#16a34a',
    borderColor: '#4ade80',
    borderWidth: 1.5,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  safeBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
