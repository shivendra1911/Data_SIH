import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { SecurityGaugeCard } from '../components/SecurityGaugeCard';
import { NearbyVictimsHelpCard } from '../components/NearbyVictimsHelpCard';
import { ZonePrediction } from '../types';
import { updateSafetyStatus } from '../services/api';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

interface StatusScreenProps {
  prediction: ZonePrediction | null;
  isRedZone?: boolean;
  onSOSTrigger?: (type: any) => void;
  networkMode?: string;
  onRefresh?: () => void;
}

export const StatusScreen: React.FC<StatusScreenProps> = ({
  prediction,
  isRedZone = false,
  onSOSTrigger,
  networkMode = 'ONLINE',
  onRefresh,
}) => {
  const [safetyStatus, setSafetyStatus] = useState<'UNKNOWN' | 'SAFE' | 'DANGER'>('UNKNOWN');
  const timerRef = useRef<any>(null);

  const deviceId = Constants.installationId || 'dev_unknown';

  const markAsSafe = async () => {
    setSafetyStatus('SAFE');
    if (timerRef.current) clearTimeout(timerRef.current);
    const success = await updateSafetyStatus(deviceId, 'SAFE');
    if (success) {
      Alert.alert('Status Updated', 'You have been marked as SAFE on the rescue dashboard.');
    }
  };

  const markAsDanger = async () => {
    setSafetyStatus('DANGER');
    await updateSafetyStatus(deviceId, 'DANGER');
    // Optional: trigger local vibration or siren here
  };

  useEffect(() => {
    // Only trigger auto-danger & notification when citizen is in a verified RED danger zone
    if (isRedZone && safetyStatus === 'UNKNOWN') {
      // Prompt user to mark safe
      Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Emergency: Are you safe?',
          body: 'You are in a RED Hazard Zone. Please open the app and mark yourself as SAFE, or rescue teams will be dispatched.',
          sound: true,
        },
        trigger: null,
      });

      // Start auto-danger timer (1 minute for testing, normally 10 mins)
      timerRef.current = setTimeout(() => {
        if (safetyStatus === 'UNKNOWN') {
          markAsDanger();
          Alert.alert('Auto-Danger Triggered', 'You did not confirm your safety. Rescue teams have been notified.');
        }
      }, 60000); // 60 seconds
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRedZone, safetyStatus]);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <SecurityGaugeCard prediction={prediction} />
      
      {/* Safety Confirmation Button */}
      <View style={styles.safetyCard}>
        <Text style={styles.safetyTitle}>Safety Confirmation</Text>
        <Text style={styles.safetyDesc}>
          If you are safe, please confirm below so rescue teams can prioritize others.
        </Text>
        
        <TouchableOpacity 
          style={[styles.safeButton, safetyStatus === 'SAFE' && styles.safeButtonActive, safetyStatus === 'DANGER' && styles.dangerButtonActive]} 
          onPress={markAsSafe}
          disabled={safetyStatus === 'SAFE'}
        >
          <Text style={styles.safeButtonText}>
            {safetyStatus === 'SAFE' ? '✔ MARKED AS SAFE' : safetyStatus === 'DANGER' ? 'MARKED AS IN DANGER' : 'I AM SAFE'}
          </Text>
        </TouchableOpacity>
      </View>

      <NearbyVictimsHelpCard />
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 100,
  },
  bottomPadding: {
    height: 60, // Space for the FAB
  },
  safetyCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  safetyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  safetyDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  safeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  safeButtonActive: {
    backgroundColor: '#2E7D32',
  },
  dangerButtonActive: {
    backgroundColor: '#D32F2F',
  },
  safeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
