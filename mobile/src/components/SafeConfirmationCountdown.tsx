import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShieldCheck, Timer, AlertOctagon } from 'lucide-react-native';

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
          <Text style={styles.title}>RED ZONE SAFETY CHECK</Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{timeFormatted}</Text>
        </View>
      </View>

      <Text style={styles.warningDesc}>
        Confirm you are safe. If unconfirmed before timer expires, NeerNetra will{' '}
        <Text style={styles.boldWarning}>automatically alert NDRF of Critical Unresponsive Danger</Text>.
      </Text>

      <TouchableOpacity style={styles.safeBtn} onPress={onConfirmSafe} activeOpacity={0.8}>
        <ShieldCheck size={22} color="#ffffff" />
        <Text style={styles.safeBtnText}>I AM SAFE — CONFIRM SAFETY</Text>
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
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#fecaca',
    fontSize: 12,
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
    fontWeight: '800',
    color: '#f87171',
  },
  safeBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#34d399',
  },
  safeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
