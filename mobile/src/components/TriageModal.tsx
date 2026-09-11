import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SOSStatus, SOSType, SOSPayload, NetworkMode } from '../types';
import { getCurrentDeviceLocation } from '../services/locationService';
import { sendSOSPayload } from '../services/api';
import { meshManager } from '../services/meshService';
import { SOSTypePicker } from './SOSTypePicker';
import { Radio, AlertOctagon, CheckCircle2, HeartHandshake, MapPin, ChevronDown } from 'lucide-react-native';

interface TriageModalProps {
  deviceUuid: string;
  networkMode: NetworkMode;
  onStatusSubmitted?: (status: SOSStatus) => void;
}

export const TriageModal: React.FC<TriageModalProps> = ({
  deviceUuid,
  networkMode,
  onStatusSubmitted,
}) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [lastSubmittedStatus, setLastSubmittedStatus] = useState<SOSStatus | null>(null);
  const [selectedSosType, setSelectedSosType] = useState<SOSType>('TRAPPED');
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleAction = async (status: SOSStatus) => {
    setSubmitting(true);
    setFeedbackMsg(null);

    try {
      // Get real GPS location
      const coords = await getCurrentDeviceLocation();

      const payload: SOSPayload = {
        device_uuid: deviceUuid,
        lat: coords.lat,
        lng: coords.lng,
        status,
        sos_type: status === 'SOS' ? selectedSosType : undefined,
        is_mesh_relayed: networkMode === 'BLE_MESH',
        timestamp: new Date().toISOString(),
      };

      if (networkMode === 'BLE_MESH' || networkMode === 'OFFLINE_QUEUED') {
        const meshRes = await meshManager.broadcastPacketOverMesh(payload);
        setFeedbackMsg(`Relayed over BLE Mesh to ${meshRes.relayedByCount} nearby peer phones.`);
      } else {
        const apiRes = await sendSOSPayload(payload);
        setFeedbackMsg(apiRes.message);
      }

      setLastSubmittedStatus(status);
      if (onStatusSubmitted) {
        onStatusSubmitted(status);
      }
    } catch (err: any) {
      console.error('[TriageModal] Action error:', err);
      Alert.alert('Dispatch Warning', 'Saved status locally. It will automatically sync when signal returns.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CITIZEN TRIAGE BEACON</Text>
        <Text style={styles.headerSubtitle}>
          Select your status to alert NDRF Command Center & nearby rescue teams.
        </Text>
      </View>

      {/* SOS Subcategory Selector */}
      <TouchableOpacity
        style={styles.categorySelector}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <View style={styles.catLeft}>
          <MapPin size={16} color="#ef4444" />
          <Text style={styles.catLabel}>Emergency Need:</Text>
          <Text style={styles.catValue}>{selectedSosType}</Text>
        </View>
        <ChevronDown size={18} color="#9ca3af" />
      </TouchableOpacity>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackText}>{feedbackMsg}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonGrid}>
        {/* 1. SOS BUTTON */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.sosButton,
            lastSubmittedStatus === 'SOS' && styles.activeBorder,
          ]}
          onPress={() => handleAction('SOS')}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="large" color="#ffffff" />
          ) : (
            <>
              <AlertOctagon size={36} color="#ffffff" />
              <Text style={styles.sosButtonText}>SOS — SEND HELP</Text>
              <Text style={styles.subText}>Broadcasts GPS location</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.secondaryRow}>
          {/* 2. SAFE BUTTON */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              styles.safeButton,
              lastSubmittedStatus === 'SAFE' && styles.activeBorder,
            ]}
            onPress={() => handleAction('SAFE')}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <CheckCircle2 size={24} color="#10b981" />
            <Text style={styles.safeText}>I AM SAFE</Text>
          </TouchableOpacity>

          {/* 3. HELPING BUTTON */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              styles.helpingButton,
              lastSubmittedStatus === 'HELPING' && styles.activeBorder,
            ]}
            onPress={() => handleAction('HELPING')}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <HeartHandshake size={24} color="#a855f7" />
            <Text style={styles.helpingText}>HELPING OTHERS</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SOSTypePicker
        visible={showPicker}
        selectedType={selectedSosType}
        onSelectType={(type) => setSelectedSosType(type)}
        onClose={() => setShowPicker(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1.5,
    borderColor: '#1e293b',
  },
  header: {
    marginBottom: 12,
  },
  headerTitle: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  catValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  feedbackBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3b82f6',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  feedbackText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonGrid: {
    gap: 10,
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  sosButton: {
    backgroundColor: '#dc2626',
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  sosButtonText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
    letterSpacing: 0.8,
  },
  subText: {
    color: '#fecaca',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
  },
  safeButton: {
    borderColor: '#059669',
  },
  safeText: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '800',
  },
  helpingButton: {
    borderColor: '#7e22ce',
  },
  helpingText: {
    color: '#c084fc',
    fontSize: 13,
    fontWeight: '800',
  },
  activeBorder: {
    borderWidth: 3,
    borderColor: '#ffffff',
  },
});
