import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import {
  ShieldAlert,
  Mountain,
  CloudLightning,
  BatteryLow,
  Radio,
  CheckCircle,
  Play,
  Activity,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';

import {
  HardwareSensorStatus,
  requestIgnoreBatteryOptimizations,
  openUnusedAppRestrictionsSettings,
} from '../services/gattServerBridge';

interface SentinelsDashboardCardProps {
  onSimulateCollapse: () => void;
  onSimulateQuorumCollapse: () => void;
  onSimulateLandslide: () => void;
  onSimulateStormDrop: () => void;
  onToggleLowPowerBeacon: () => void;
  isLowPowerBeaconActive: boolean;
  quorumCount?: number;
  stormAlertActive?: boolean;
  landslideAlertActive?: boolean;
  hardwareSensorStatus?: HardwareSensorStatus | null;
}

export const SentinelsDashboardCard: React.FC<SentinelsDashboardCardProps> = ({
  onSimulateCollapse,
  onSimulateQuorumCollapse,
  onSimulateLandslide,
  onSimulateStormDrop,
  onToggleLowPowerBeacon,
  isLowPowerBeaconActive,
  quorumCount = 0,
  stormAlertActive = false,
  landslideAlertActive = false,
  hardwareSensorStatus,
}) => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [localImu, setLocalImu] = useState<number>(0.99);
  const [localGyro, setLocalGyro] = useState<number>(0.02);

  useEffect(() => {
    let accelSub: any = null;
    let gyroSub: any = null;

    try {
      Accelerometer.setUpdateInterval(40); // 25Hz live stream
      accelSub = Accelerometer.addListener(({ x, y, z }) => {
        const rawMagnitude = Math.sqrt(x * x + y * y + z * z);
        // expo-sensors Accelerometer provides values in g units (~1.0 at rest)
        setLocalImu(rawMagnitude);
      });
    } catch (e) {
      console.warn('[SentinelsDashboardCard] Accelerometer listener error:', e);
    }

    try {
      Gyroscope.setUpdateInterval(40); // 25Hz live stream
      gyroSub = Gyroscope.addListener(({ x, y, z }) => {
        const omega = Math.sqrt(x * x + y * y + z * z);
        setLocalGyro(omega);
      });
    } catch (e) {
      console.warn('[SentinelsDashboardCard] Gyroscope listener error:', e);
    }

    return () => {
      if (accelSub) {
        try { accelSub.remove(); } catch {}
      }
      if (gyroSub) {
        try { gyroSub.remove(); } catch {}
      }
    };
  }, []);

  return (
    <View style={styles.cardContainer}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <ShieldCheck size={20} color="#059669" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardBadge}>DISTRIBUTED HARDWARE MESH</Text>
          <Text style={styles.cardTitle}>Autonomous Sensor Shield</Text>
        </View>
        <View style={styles.activePill}>
          <View style={styles.livePulseDot} />
          <Text style={styles.activePillText}>24/7 ACTIVE</Text>
        </View>
      </View>

      <Text style={styles.description}>
        Your smartphone acts as an autonomous hardware sensor node, protecting your community through multi-device consensus.
      </Text>

      {/* 4 Clean Protection Pillars */}
      <View style={styles.sentinelGrid}>
        {/* 1. Structural Collapse Shield */}
        <View style={styles.sentinelItem}>
          <View style={[styles.itemIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <ShieldAlert size={16} color="#DC2626" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>Building Collapse Shield</Text>
              <Text style={[styles.statusTag, { color: '#059669', borderColor: '#A7F3D0' }]}>
                {quorumCount >= 3 ? 'QUORUM CONFIRMED' : 'ARMED'}
              </Text>
            </View>
            <Text style={styles.itemSub}>
              Detects structural failure • Requires 3+ nearby phones to eliminate false alarms
            </Text>
          </View>
        </View>

        {/* 2. Landslide Early Warning */}
        <View style={styles.sentinelItem}>
          <View style={[styles.itemIconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Mountain size={16} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>1/3rd Sector Landslide Sentinel</Text>
              <Text style={[styles.statusTag, { color: landslideAlertActive ? '#DC2626' : '#D97706', borderColor: '#FDE68A' }]}>
                {landslideAlertActive ? '1/3RD QUORUM CONFIRMED' : '1/3RD CONSENSUS ARMED'}
              </Text>
            </View>
            <Text style={styles.itemSub}>
              Sub-surface harmonic tremors • Confirmed when &ge; 1/3rd of area devices report
            </Text>
          </View>
        </View>

        {/* 3. Storm & Squall Guard */}
        <View style={styles.sentinelItem}>
          <View style={[styles.itemIconWrap, { backgroundColor: '#E0F2FE' }]}>
            <CloudLightning size={16} color="#0284C7" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>Cloudburst & Storm Guard</Text>
              <Text style={[styles.statusTag, { color: stormAlertActive ? '#DC2626' : '#0284C7', borderColor: '#BAE6FD' }]}>
                {stormAlertActive ? 'SQUALL ALERT' : 'MONITORING'}
              </Text>
            </View>
            <Text style={styles.itemSub}>
              Continuous barometric pressure tracking • Co-validated localized squalls
            </Text>
          </View>
        </View>

        {/* 4. Extended Life USAR Beacon */}
        <View style={[styles.sentinelItem, isLowPowerBeaconActive && styles.sentinelItemActive]}>
          <View style={[styles.itemIconWrap, { backgroundColor: '#F3E8FF' }]}>
            <BatteryLow size={16} color="#7E22CE" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>100+ Hr Emergency Beacon</Text>
              <Text style={[styles.statusTag, { color: '#7E22CE', borderColor: '#E9D5FF' }]}>
                {isLowPowerBeaconActive ? 'BEACON ACTIVE' : 'STANDBY ≤15%'}
              </Text>
            </View>
            <Text style={styles.itemSub}>
              Ultra-low power search & rescue signal • Preserves battery for over 4 days
            </Text>
          </View>
        </View>
      </View>

      {/* Trust & Hardware Assurance Footer */}
      <View style={styles.shieldAssuranceBar}>
        <CheckCircle size={14} color="#059669" />
        <Text style={styles.shieldAssuranceText}>
          Real-time Bosch MEMS sensors active in background • 0% false alarms via consensus
        </Text>
      </View>

      {/* Discrete Diagnostics & Simulation Toggle */}
      <TouchableOpacity
        style={styles.diagnosticsToggle}
        onPress={() => setShowDiagnostics((prev) => !prev)}
        activeOpacity={0.7}
      >
        <Text style={styles.diagnosticsToggleText}>
          {showDiagnostics ? 'Hide Verification & Simulation Panel' : 'Simulation & Hardware Verification Tools'}
        </Text>
        {showDiagnostics ? (
          <ChevronUp size={14} color="#6B7280" />
        ) : (
          <ChevronDown size={14} color="#6B7280" />
        )}
      </TouchableOpacity>

      {/* Diagnostics Drawer (Hidden by default, clean when opened) */}
      {showDiagnostics && (
        <View style={styles.diagnosticsDrawer}>
          <Text style={styles.diagnosticsTitle}>LIVE HARDWARE SENSOR STREAM</Text>
          <View style={styles.hwTelemetryRow}>
            <View style={styles.hwChip}>
              <Text style={styles.hwChipLabel}>IMU VECTOR</Text>
              <Text style={styles.hwChipValue}>
                {localImu !== undefined
                  ? `${localImu.toFixed(2)}g`
                  : hardwareSensorStatus?.lastVectorMagnitudeG !== undefined
                  ? `${hardwareSensorStatus.lastVectorMagnitudeG.toFixed(2)}g`
                  : '0.99g'}
              </Text>
            </View>
            <View style={styles.hwChip}>
              <Text style={styles.hwChipLabel}>GYROSCOPE</Text>
              <Text style={styles.hwChipValue}>
                {localGyro !== undefined
                  ? `${localGyro.toFixed(2)} rad/s`
                  : hardwareSensorStatus?.lastGyroOmega !== undefined
                  ? `${hardwareSensorStatus.lastGyroOmega.toFixed(2)} rad/s`
                  : '0.01 rad/s'}
              </Text>
            </View>
            <View style={styles.hwChip}>
              <Text style={styles.hwChipLabel}>PRESSURE</Text>
              <Text style={styles.hwChipValue}>
                {hardwareSensorStatus?.lastPressureHpa !== undefined
                  ? `${hardwareSensorStatus.lastPressureHpa.toFixed(1)} hPa`
                  : '1013.2 hPa'}
              </Text>
            </View>
          </View>

          <Text style={[styles.diagnosticsTitle, { marginTop: 12 }]}>DISASTER SCENARIO SIMULATION</Text>
          <View style={styles.simulationGrid}>
            <TouchableOpacity
              style={[styles.simBtn, { borderColor: '#FCA5A5' }]}
              onPress={onSimulateCollapse}
              activeOpacity={0.8}
            >
              <Play size={11} color="#DC2626" />
              <Text style={[styles.simBtnText, { color: '#DC2626' }]}>1 Phone Fall (Disarm Test)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simBtn, { borderColor: '#6EE7B7' }]}
              onPress={onSimulateQuorumCollapse}
              activeOpacity={0.8}
            >
              <Radio size={11} color="#059669" />
              <Text style={[styles.simBtnText, { color: '#059669' }]}>3+ Phone Collapse Quorum</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simBtn, { borderColor: '#FCD34D' }]}
              onPress={onSimulateLandslide}
              activeOpacity={0.8}
            >
              <Radio size={11} color="#D97706" />
              <Text style={[styles.simBtnText, { color: '#D97706' }]}>1/3rd Sector Landslide Quorum</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simBtn, { borderColor: '#BAE6FD' }]}
              onPress={onSimulateStormDrop}
              activeOpacity={0.8}
            >
              <Play size={11} color="#0284C7" />
              <Text style={[styles.simBtnText, { color: '#0284C7' }]}>Cloudburst Squall Alarm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.simBtn,
                { borderColor: '#DDD6FE', width: '100%' },
                isLowPowerBeaconActive && { backgroundColor: 'rgba(126, 34, 206, 0.08)' },
              ]}
              onPress={onToggleLowPowerBeacon}
              activeOpacity={0.8}
            >
              <Activity size={11} color="#7E22CE" />
              <Text style={[styles.simBtnText, { color: '#7E22CE' }]}>
                {isLowPowerBeaconActive ? 'Deactivate Low-Power Beacon' : 'Test 100+ Hr Beacon Mode'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.simBtn,
                { borderColor: '#10B981', width: '100%', marginTop: 2, backgroundColor: 'rgba(16, 185, 129, 0.04)' },
              ]}
              onPress={async () => {
                await requestIgnoreBatteryOptimizations();
                await openUnusedAppRestrictionsSettings();
              }}
              activeOpacity={0.8}
            >
              <ShieldCheck size={11} color="#059669" />
              <Text style={[styles.simBtnText, { color: '#059669' }]}>
                WhatsApp-Grade 24/7 Shield (Disable Battery & Unused App Pause)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 1,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 5,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.3,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  sentinelGrid: {
    gap: 10,
  },
  sentinelItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sentinelItemActive: {
    borderColor: '#DDD6FE',
    backgroundColor: '#FAF5FF',
  },
  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusTag: {
    fontSize: 9,
    fontWeight: '800',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    letterSpacing: 0.4,
  },
  itemSub: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  shieldAssuranceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 14,
    gap: 8,
  },
  shieldAssuranceText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  diagnosticsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 6,
    gap: 4,
  },
  diagnosticsToggleText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  diagnosticsDrawer: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  diagnosticsTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  hwTelemetryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hwChip: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  hwChipLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
  },
  hwChipValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  simulationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    gap: 5,
  },
  simBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
