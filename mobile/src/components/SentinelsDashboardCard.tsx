import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  ShieldAlert,
  Mountain,
  CloudLightning,
  BatteryLow,
  Radio,
  CheckCircle,
  Play,
  Activity,
  Layers,
} from 'lucide-react-native';

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
}) => {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Layers size={18} color="#D97706" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardBadge}>OFFLINE RESILIENCE GUARDIANS</Text>
          <Text style={styles.cardTitle}>Kinetic & Environmental Sentinels</Text>
        </View>
        <View style={styles.activePill}>
          <Activity size={12} color="#10B981" />
          <Text style={styles.activePillText}>4 ACTIVE</Text>
        </View>
      </View>

      <Text style={styles.description}>
        Autonomous background hardware monitors operating without cellular connectivity or GPS:
      </Text>

      {/* Sentinel 1: 3-Phase Building Collapse & Mesh Quorum */}
      <View style={styles.sentinelBox}>
        <View style={styles.sentinelTop}>
          <View style={[styles.sentinelIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <ShieldAlert size={16} color="#DC2626" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.sentinelTitleRow}>
              <Text style={styles.sentinelName}>3-Phase Structural Collapse Sentinel</Text>
              <Text style={styles.liveTag}>50Hz SENSORS</Text>
            </View>
            <Text style={styles.sentinelSub}>
              Free-fall (&lt;0.35g) ➔ Shock Impact (&ge;3.5g) ➔ Rubble Stillness (8s) ➔ 60s Inverted Safety Triage
            </Text>
            {quorumCount >= 3 && (
              <View style={styles.quorumIndicator}>
                <Radio size={12} color="#059669" />
                <Text style={styles.quorumIndicatorText}>
                  Consensus Verified: {quorumCount}+ phones agreed within 100m / 15s
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={onSimulateCollapse}
            activeOpacity={0.8}
          >
            <Play size={12} color="#DC2626" />
            <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Test 3-Phase Collapse (4.8g)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnOutline, { borderColor: '#059669' }]}
            onPress={onSimulateQuorumCollapse}
            activeOpacity={0.8}
          >
            <Radio size={12} color="#059669" />
            <Text style={[styles.actionBtnText, { color: '#059669' }]}>Test 3-Device Quorum</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sentinel 2: Night Landslide Harmonic Tremor (Wayanad 2AM) */}
      <View style={styles.sentinelBox}>
        <View style={styles.sentinelTop}>
          <View style={[styles.sentinelIconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Mountain size={16} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.sentinelTitleRow}>
              <Text style={styles.sentinelName}>Night Landslide Vibration Sentinel</Text>
              <Text style={[styles.liveTag, { color: '#D97706', borderColor: '#FDE68A' }]}>WAYANAD SENTINEL</Text>
            </View>
            <Text style={styles.sentinelSub}>
              Monitors sub-surface 10–50 Hz acoustic harmonic tremors for &ge;30s while charging; triggers 100 dB multi-tone wake alarm.
            </Text>
            {landslideAlertActive && (
              <View style={[styles.quorumIndicator, { borderColor: '#F59E0B' }]}>
                <CheckCircle size={12} color="#D97706" />
                <Text style={[styles.quorumIndicatorText, { color: '#D97706' }]}>
                  Harmonic Tremor Active • Evacuation Broadcast Armed
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionBtnOutline, { borderColor: '#D97706' }]}
            onPress={onSimulateLandslide}
            activeOpacity={0.8}
          >
            <Play size={12} color="#D97706" />
            <Text style={[styles.actionBtnText, { color: '#D97706' }]}>Test 28Hz Tremor Alarm</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sentinel 3: In-Device Barometric Pressure Storm Sentinel */}
      <View style={styles.sentinelBox}>
        <View style={styles.sentinelTop}>
          <View style={[styles.sentinelIconWrap, { backgroundColor: '#E0F2FE' }]}>
            <CloudLightning size={16} color="#0284C7" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.sentinelTitleRow}>
              <Text style={styles.sentinelName}>Barometric Pressure Storm Sentinel</Text>
              <Text style={[styles.liveTag, { color: '#0284C7', borderColor: '#BAE6FD' }]}>3-HOUR SLIDING</Text>
            </View>
            <Text style={styles.sentinelSub}>
              Continuous sensor tracking: &Delta;P &ge; 3.0 hPa indicates severe convective squall; &Delta;P &ge; 6.0 hPa triggers cloudburst alert.
            </Text>
            {stormAlertActive && (
              <View style={[styles.quorumIndicator, { borderColor: '#0284C7' }]}>
                <CheckCircle size={12} color="#0284C7" />
                <Text style={[styles.quorumIndicatorText, { color: '#0284C7' }]}>
                  Barometric Squall Alert Active
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionBtnOutline, { borderColor: '#0284C7' }]}
            onPress={onSimulateStormDrop}
            activeOpacity={0.8}
          >
            <Play size={12} color="#0284C7" />
            <Text style={[styles.actionBtnText, { color: '#0284C7' }]}>Test Cloudburst Drop (-4.5 hPa)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sentinel 4: 100+ Hour Emergency Low-Power BLE Beacon Mode */}
      <View style={[styles.sentinelBox, isLowPowerBeaconActive && styles.sentinelBoxActive]}>
        <View style={styles.sentinelTop}>
          <View style={[styles.sentinelIconWrap, { backgroundColor: '#F3E8FF' }]}>
            <BatteryLow size={16} color="#7E22CE" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.sentinelTitleRow}>
              <Text style={styles.sentinelName}>100+ Hour Emergency Low-Power BLE</Text>
              <Text style={[styles.liveTag, { color: '#7E22CE', borderColor: '#E9D5FF' }]}>
                {isLowPowerBeaconActive ? 'BEACON ACTIVE' : 'AUTO ≤15%'}
              </Text>
            </View>
            <Text style={styles.sentinelSub}>
              Cuts heavy background polling when battery &le;15%; broadcasts 16-byte raw BLE USAR beacon every 1200ms for 100+ continuous hours.
            </Text>
          </View>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.actionBtnOutline,
              { borderColor: isLowPowerBeaconActive ? '#10B981' : '#7E22CE' },
              isLowPowerBeaconActive && { backgroundColor: 'rgba(16, 185, 129, 0.08)' },
            ]}
            onPress={onToggleLowPowerBeacon}
            activeOpacity={0.8}
          >
            <Radio size={12} color={isLowPowerBeaconActive ? '#10B981' : '#7E22CE'} />
            <Text
              style={[
                styles.actionBtnText,
                { color: isLowPowerBeaconActive ? '#10B981' : '#7E22CE' },
              ]}
            >
              {isLowPowerBeaconActive
                ? '✔ 100h Beacon Active (Tap to Restore Normal)'
                : 'Test 100+ Hour USAR Beacon Mode'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 1,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 14,
    lineHeight: 16,
  },
  sentinelBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sentinelBoxActive: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  sentinelTop: {
    flexDirection: 'row',
    gap: 10,
  },
  sentinelIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentinelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sentinelName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  liveTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 6,
    paddingVertical: 1,
    paddingHorizontal: 5,
    marginLeft: 6,
  },
  sentinelSub: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  quorumIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignSelf: 'flex-start',
  },
  quorumIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 5,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
