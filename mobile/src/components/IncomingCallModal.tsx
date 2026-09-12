import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from 'react-native';
import { Phone, PhoneOff, Radio, ShieldAlert } from 'lucide-react-native';

interface IncomingCallModalProps {
  visible: boolean;
  caller: {
    id: string;
    name: string;
    distance?: number;
    hopCount?: number;
  } | null;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  visible,
  caller,
  onAccept,
  onDecline,
}) => {
  useEffect(() => {
    if (visible) {
      Vibration.vibrate([0, 600, 400, 600], true);
    } else {
      Vibration.cancel();
    }
    return () => {
      Vibration.cancel();
    };
  }, [visible]);

  if (!visible || !caller) return null;

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Top Pill */}
          <View style={styles.headerPill}>
            <Radio size={14} color="#10b981" />
            <Text style={styles.headerPillText}>BLE MESH INTERCOM CALL</Text>
          </View>

          {/* Avatar / Pulse circle */}
          <View style={styles.avatarContainer}>
            <View style={styles.pulseRing} />
            <View style={styles.avatarInner}>
              <Phone size={32} color="#ffffff" />
            </View>
          </View>

          {/* Caller Details */}
          <Text style={styles.callerName}>{caller.name}</Text>
          <Text style={styles.callerMeta}>
            {caller.distance ? `~${caller.distance}m away` : 'Nearby peer node'}
            {' • '}
            {caller.hopCount && caller.hopCount > 1
              ? `Relayed (${caller.hopCount} Hops)`
              : 'Direct Peer-to-Peer RF'}
          </Text>

          <View style={styles.offlineNotice}>
            <ShieldAlert size={14} color="#059669" />
            <Text style={styles.offlineNoticeText}>
              Autonomous P2P Bluetooth Channel (No Cell Towers Needed)
            </Text>
          </View>

          {/* Buttons: Decline vs Accept */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, styles.declineBtn]}
              onPress={onDecline}
              activeOpacity={0.8}
            >
              <View style={styles.btnIconCircle}>
                <PhoneOff size={22} color="#ffffff" />
              </View>
              <Text style={styles.btnText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.acceptBtn]}
              onPress={onAccept}
              activeOpacity={0.8}
            >
              <View style={styles.btnIconCircle}>
                <Phone size={22} color="#ffffff" />
              </View>
              <Text style={styles.btnText}>Accept</Text>
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
    backgroundColor: 'rgba(5, 15, 25, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0f172a',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  headerPillText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pulseRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  avatarInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  callerName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  callerMeta: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 28,
  },
  offlineNoticeText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    backgroundColor: '#ef4444',
  },
  acceptBtn: {
    backgroundColor: '#10b981',
  },
  btnIconCircle: {
    marginBottom: 4,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
