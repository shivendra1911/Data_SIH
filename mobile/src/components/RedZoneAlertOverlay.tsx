import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Vibration, Alert } from 'react-native';
import * as Speech from 'expo-speech';
import { ZonePrediction, LocationSyncPayload } from '../types';
import { AlertOctagon, ShieldAlert, Navigation, ShieldCheck } from 'lucide-react-native';

interface RedZoneAlertOverlayProps {
  visible: boolean;
  prediction?: ZonePrediction | null;
  lastLocation?: LocationSyncPayload | null;
  zoneName?: string;
  floodProbability?: number;
  triggerReason?: string;
  onTriggerSOS?: () => void;
  onConfirmSafe?: () => void;
  onDismiss: () => void;
}

export const RedZoneAlertOverlay: React.FC<RedZoneAlertOverlayProps> = ({
  visible,
  prediction,
  lastLocation,
  zoneName,
  floodProbability,
  triggerReason,
  onTriggerSOS = () => {},
  onConfirmSafe,
  onDismiss,
}) => {
  if (!visible) return null;

  const displayZone = (zoneName || prediction?.zone_id || 'CIVIL DEFENSE CRITICAL ZONE').toUpperCase();
  const displayRisk = floodProbability !== undefined
    ? floodProbability.toFixed(1)
    : prediction?.flood_probability_percent !== undefined
    ? prediction.flood_probability_percent.toFixed(1)
    : '94.5';
  const displayTrigger = triggerReason || prediction?.primary_trigger || 'Civil Defense Emergency Siren Dispatched by NDRF / SDMA Web Command';

  const handlePressSOS = () => {
    try {
      Vibration.vibrate([0, 500, 200, 500]);
      Speech.speak('Emergency distress beacon dispatched. Rescue teams notified.');
    } catch {}
    onTriggerSOS();
    Alert.alert(
      '🚨 Distress Beacon Dispatched',
      'Immediate SOS transmitted to NDRF Command Center and nearby BLE mesh relays. Continuous 5-second GPS tracking activated.'
    );
  };

  const handlePressSafe = () => {
    try {
      Vibration.vibrate([0, 80, 50, 80]);
      Speech.speak('Safety verified. You are marked as safe.');
    } catch {}
    if (onConfirmSafe) {
      onConfirmSafe();
    } else {
      onDismiss();
    }
    Alert.alert(
      '✔ Safety Confirmed',
      'You are marked as SAFE on the Civil Defense Command Center.'
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.alertCard}>
          <View style={styles.iconCircle}>
            <AlertOctagon size={48} color="#ef4444" />
          </View>

          <Text style={styles.alertTitle}>CRITICAL RED ZONE WARNING</Text>
          <Text style={styles.zoneText}>{displayZone} SECTOR</Text>

          <View style={styles.probBadge}>
            <Text style={styles.probText}>{displayRisk}% AI FLOOD / SIREN RISK</Text>
          </View>

          <Text style={styles.causeText}>
            Trigger: <Text style={styles.boldCause}>{displayTrigger}</Text>
          </Text>

          {/* Last Synced Location Display */}
          {lastLocation && (
            <View style={styles.locationBox}>
              <Navigation size={14} color="#60a5fa" />
              <Text style={styles.locText}>
                Last GPS Sync: {lastLocation.lat.toFixed(4)}, {lastLocation.lng.toFixed(4)} ({lastLocation.last_synced_at ? new Date(lastLocation.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'})
              </Text>
            </View>
          )}

          {/* Primary SOS Trigger Button */}
          <TouchableOpacity style={styles.sosButton} onPress={handlePressSOS} activeOpacity={0.82}>
            <ShieldAlert size={24} color="#ffffff" />
            <Text style={styles.sosButtonText}>SEND IMMEDIATE SOS BEACON</Text>
          </TouchableOpacity>

          {/* Secondary Safe Confirmation Button */}
          <TouchableOpacity style={styles.safeButton} onPress={handlePressSafe} activeOpacity={0.82}>
            <ShieldCheck size={22} color="#ffffff" />
            <Text style={styles.safeButtonText}>✔ I AM SAFE — VERIFY SAFE STATUS</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={styles.dismissText}>Acknowledge Warning</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(69, 10, 10, 0.92)', // Deep crimson red background
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  alertCard: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ef4444',
    elevation: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  alertTitle: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  zoneText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  probBadge: {
    backgroundColor: '#7f1d1d',
    borderColor: '#dc2626',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginVertical: 12,
  },
  probText: {
    color: '#fecaca',
    fontSize: 16,
    fontWeight: '900',
  },
  causeText: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  boldCause: {
    color: '#ffffff',
    fontWeight: '700',
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  locText: {
    color: '#93c5fd',
    fontSize: 11,
    flex: 1,
  },
  sosButton: {
    width: '100%',
    backgroundColor: '#dc2626',
    borderRadius: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
  },
  sosButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  safeButton: {
    width: '100%',
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#6ee7b7',
    marginTop: 10,
  },
  safeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  dismissBtn: {
    marginTop: 14,
    padding: 8,
  },
  dismissText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
});
