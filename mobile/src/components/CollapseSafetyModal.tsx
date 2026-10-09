import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { AlertTriangle, ShieldCheck, PhoneCall, Radio } from 'lucide-react-native';
import { CollapseEventData } from '../services/buildingCollapseDetector';

interface CollapseSafetyModalProps {
  visible: boolean;
  secondsRemaining: number;
  eventData: CollapseEventData | null;
  quorumCount?: number;
  onConfirmSafe: () => void;
  onDispatchImmediately: () => void;
}

export const CollapseSafetyModal: React.FC<CollapseSafetyModalProps> = ({
  visible,
  secondsRemaining,
  eventData,
  quorumCount = 0,
  onConfirmSafe,
  onDispatchImmediately,
}) => {
  if (!visible) return null;

  const peakG = eventData?.peakG || 4.2;
  const confidence = Math.round((eventData?.confidence || 0.90) * 100);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header Warning */}
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <AlertTriangle color="#FFFFFF" size={32} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>STRUCTURAL COLLAPSE</Text>
              <Text style={styles.subtitle}>Kinetic shock & rubble stillness detected</Text>
            </View>
          </View>

          {/* Quorum Badge if 3+ phones agreed */}
          {quorumCount >= 3 && (
            <View style={styles.quorumBadge}>
              <Radio color="#10B981" size={16} />
              <Text style={styles.quorumText}>
                MESH QUORUM: {quorumCount} Phones Confirmed Collapse Within 100m!
              </Text>
            </View>
          )}

          {/* Telemetry Stats */}
          <View style={styles.telemetryRow}>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>PEAK IMPACT</Text>
              <Text style={styles.telemetryValue}>{peakG} g</Text>
            </View>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>CONFIDENCE</Text>
              <Text style={styles.telemetryValue}>{confidence}%</Text>
            </View>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>FREE-FALL</Text>
              <Text style={styles.telemetryValue}>{(eventData?.freeFallDurationMs || 320)} ms</Text>
            </View>
          </View>

          {/* Countdown Indicator */}
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownNumber}>{secondsRemaining}</Text>
            <Text style={styles.countdownLabel}>SECONDS UNTIL AUTOMATIC USAR DISPATCH</Text>
          </View>

          <Text style={styles.instruction}>
            Are you safe? If you do not respond, a high-priority distress beacon with your exact coordinates will be broadcast across the offline mesh network.
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonStack}>
            <TouchableOpacity
              style={styles.safeButton}
              activeOpacity={0.8}
              onPress={onConfirmSafe}
            >
              <ShieldCheck color="#FFFFFF" size={24} style={styles.btnIcon} />
              <Text style={styles.safeButtonText}>I AM SAFE (CANCEL ALARM)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dispatchButton}
              activeOpacity={0.8}
              onPress={onDispatchImmediately}
            >
              <PhoneCall color="#FFFFFF" size={20} style={styles.btnIcon} />
              <Text style={styles.dispatchButtonText}>I AM TRAPPED (DISPATCH NOW)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1E1B18',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#DC2626',
    padding: 24,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 2,
  },
  quorumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  quorumText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  telemetryBox: {
    flex: 1,
    backgroundColor: '#292524',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#44403C',
  },
  telemetryLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  telemetryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F97316',
    marginTop: 4,
  },
  countdownContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.4)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 16,
  },
  countdownNumber: {
    fontSize: 54,
    fontWeight: '900',
    color: '#EF4444',
  },
  countdownLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F87171',
    marginTop: 2,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  instruction: {
    fontSize: 13,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 22,
  },
  buttonStack: {
    width: '100%',
  },
  safeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
  },
  safeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dispatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
  },
  dispatchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  btnIcon: {
    marginRight: 8,
  },
});
