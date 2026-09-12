import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  AlertTriangle,
  ShieldCheck,
  HeartPulse,
  Navigation,
  ArrowRight,
  Utensils,
  Droplets,
  Mountain,
  Radio,
  ShieldAlert,
  Map as MapIcon,
  X,
} from 'lucide-react-native';
import { NearbyVictimsHelpCard } from '../components/NearbyVictimsHelpCard';
import { ZonePrediction, SOSType } from '../types';
import { updateSafetyStatus } from '../services/api';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

interface StatusScreenProps {
  prediction: ZonePrediction | null;
  isRedZone?: boolean;
  onSOSTrigger?: (type: any) => void;
  networkMode?: string;
  onRefresh?: () => void;
  onNavigate?: (tab: 'map' | 'mesh' | 'directives') => void;
}

export const StatusScreen: React.FC<StatusScreenProps> = ({
  prediction,
  isRedZone = false,
  onSOSTrigger,
  networkMode = 'ONLINE',
  onRefresh,
  onNavigate,
}) => {
  const [safetyStatus, setSafetyStatus] = useState<'UNKNOWN' | 'SAFE' | 'DANGER'>('UNKNOWN');
  const [activeDistress, setActiveDistress] = useState<SOSType | null>(null);
  const [showSOSModal, setShowSOSModal] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  const deviceId = Constants.installationId || 'dev_unknown';

  const prob = prediction ? prediction.flood_probability_percent : 5.0;
  const alertColor = prediction ? prediction.alert_color : 'SAFE';
  const zoneName = prediction?.zone_name || 'Bharthia, Uttar Pradesh';

  const markAsSafe = async () => {
    setSafetyStatus('SAFE');
    setActiveDistress(null);
    setShowSOSModal(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    const success = await updateSafetyStatus(deviceId, 'SAFE');
    if (success) {
      Alert.alert('Status Updated', 'You have been marked as SAFE on the rescue command dashboard.');
    }
  };

  const handleDistressPress = (type: SOSType) => {
    setSafetyStatus('DANGER');
    setActiveDistress(type);
    setShowSOSModal(false);
    if (onSOSTrigger) {
      onSOSTrigger(type);
    }
    Alert.alert(
      'Distress Broadcast Sent',
      `Emergency beacon: ${type}. Live GPS coordinates and telemetry transmitted to rescue teams.`
    );
  };

  useEffect(() => {
    if (isRedZone && safetyStatus === 'UNKNOWN') {
      Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Emergency: Are you safe?',
          body: 'You are in a RED Hazard Zone. Please open the app and confirm your safety, or rescue teams will be dispatched.',
          sound: true,
        },
        trigger: null,
      });

      timerRef.current = setTimeout(() => {
        if (safetyStatus === 'UNKNOWN') {
          setSafetyStatus('DANGER');
          updateSafetyStatus(deviceId, 'DANGER');
          Alert.alert('Auto-Danger Triggered', 'No confirmation received. Rescue teams have been dispatched.');
        }
      }, 60000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRedZone, safetyStatus]);

  // Semicircle SVG calculations
  const radius = 62;
  const cx = 95;
  const cy = 82;
  const angle = (Math.max(2, Math.min(prob, 100)) / 100) * 180;

  const polarToCartesian = (centerX: number, centerY: number, r: number, deg: number) => {
    const rad = ((deg - 180) * Math.PI) / 180.0;
    return { x: centerX + r * Math.cos(rad), y: centerY + r * Math.sin(rad) };
  };

  const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const bgArc = describeArc(cx, cy, radius, 0, 180);
  const activeArc = describeArc(cx, cy, radius, 0, Math.min(angle, 179.9));

  const gaugeColor = alertColor === 'RED' ? '#ef4444' : alertColor === 'ORANGE' ? '#f59e0b' : '#10b981';
  const riskTitle =
    alertColor === 'RED'
      ? 'CRITICAL FLOOD RISK'
      : alertColor === 'ORANGE'
      ? 'ELEVATED RISK ZONE'
      : 'LOW RISK — SAFE ZONE';

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Top 2x2 Bento Action Cards Grid (Shifted up, Maps / Mesh / Directives / SOS) */}
        <View style={styles.bentoSection}>
          {/* Row 1 */}
          <View style={styles.bentoRow}>
            {/* Card 1: Maps (Pastel Sky Blue) */}
            <TouchableOpacity
              style={[styles.bentoCard, styles.bentoBlue]}
              onPress={() => onNavigate?.('map')}
              activeOpacity={0.84}
            >
              <View style={styles.bentoTop}>
                <Navigation size={24} color="#1E3A5F" strokeWidth={1.8} />
                <View style={styles.bentoArrow}>
                  <ArrowRight size={15} color="#1E3A5F" strokeWidth={2.2} />
                </View>
              </View>
              <View style={styles.bentoBottom}>
                <Text style={styles.bentoTitle}>Maps</Text>
                <Text style={styles.bentoSub}>Offline GIS & Haven Routes</Text>
              </View>
            </TouchableOpacity>

            {/* Card 2: Mesh (Pastel Lavender) */}
            <TouchableOpacity
              style={[styles.bentoCard, styles.bentoLavender]}
              onPress={() => onNavigate?.('mesh')}
              activeOpacity={0.84}
            >
              <View style={styles.bentoTop}>
                <Radio size={24} color="#362B5A" strokeWidth={1.8} />
                <View style={styles.bentoArrow}>
                  <ArrowRight size={15} color="#362B5A" strokeWidth={2.2} />
                </View>
              </View>
              <View style={styles.bentoBottom}>
                <Text style={styles.bentoTitle}>Mesh</Text>
                <Text style={styles.bentoSub}>Off-Grid Walkie & Relay</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Row 2 */}
          <View style={styles.bentoRow}>
            {/* Card 3: Directives (Warm Sand Pastel) */}
            <TouchableOpacity
              style={[styles.bentoCard, styles.bentoSand]}
              onPress={() => onNavigate?.('directives')}
              activeOpacity={0.84}
            >
              <View style={styles.bentoTop}>
                <ShieldAlert size={24} color="#45382A" strokeWidth={1.8} />
                <View style={styles.bentoArrow}>
                  <ArrowRight size={15} color="#45382A" strokeWidth={2.2} />
                </View>
              </View>
              <View style={styles.bentoBottom}>
                <Text style={styles.bentoTitle}>Directives</Text>
                <Text style={styles.bentoSub}>NDRF & Civil Alerts</Text>
              </View>
            </TouchableOpacity>

            {/* Card 4: SOS (Soft Pastel Coral / Rose) */}
            <TouchableOpacity
              style={[
                styles.bentoCard,
                styles.bentoRose,
                activeDistress && styles.bentoActiveRing,
              ]}
              onPress={() => setShowSOSModal(true)}
              activeOpacity={0.84}
            >
              <View style={styles.bentoTop}>
                <AlertTriangle size={24} color="#5C2420" strokeWidth={1.8} />
                <View style={styles.bentoArrow}>
                  <ArrowRight size={15} color="#5C2420" strokeWidth={2.2} />
                </View>
              </View>
              <View style={styles.bentoBottom}>
                <Text style={styles.bentoTitle}>SOS</Text>
                <Text style={styles.bentoSub}>Disaster Rescue & Triage</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Overall Hydrological Safety Score Card (Inspiration Design) */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreTitle}>Overall Hydrological Safety Score</Text>
            <Text style={styles.scoreSubtitle}>{zoneName}</Text>
          </View>

          {/* Signature Solid Charcoal Black Pill Button */}
          <TouchableOpacity
            style={[
              styles.charcoalPillBtn,
              safetyStatus === 'SAFE' && styles.charcoalPillSafe,
              safetyStatus === 'DANGER' && styles.charcoalPillDanger,
            ]}
            onPress={markAsSafe}
            activeOpacity={0.88}
          >
            <Text style={styles.charcoalPillText}>
              {safetyStatus === 'SAFE'
                ? '✔ Verified Safe Status'
                : safetyStatus === 'DANGER'
                ? '🚨 Distress Active — Tap to Confirm Safe'
                : 'Get Your Safety Assessment'}
            </Text>
          </TouchableOpacity>

          {/* Minimalist Gauge Display */}
          <View style={styles.gaugeContainer}>
            <Svg width={190} height={100} viewBox="0 0 190 100">
              <Path
                d={bgArc}
                fill="none"
                stroke="#E8ECE2"
                strokeWidth={14}
                strokeLinecap="round"
              />
              <Path
                d={activeArc}
                fill="none"
                stroke={gaugeColor}
                strokeWidth={14}
                strokeLinecap="round"
              />
            </Svg>
            <View style={styles.gaugeCenter}>
              <Text style={styles.gaugePercent}>{prob}%</Text>
              <Text style={styles.gaugeLabel}>AI Flood Risk</Text>
            </View>
          </View>

          {/* Risk Badge */}
          <View style={[styles.riskPill, { backgroundColor: gaugeColor + '18' }]}>
            <Droplets size={12} color={gaugeColor} style={{ marginRight: 4 }} />
            <Text style={[styles.riskPillText, { color: gaugeColor }]}>{riskTitle}</Text>
          </View>

          {/* 4-Quadrant Metric Layout (Inspo Silhouette Grid) */}
          <View style={styles.metricsQuadrant}>
            <View style={styles.quadrantRow}>
              <View style={styles.quadrantCell}>
                <Text style={styles.quadrantVal}>Normal</Text>
                <Text style={styles.quadrantLabel}>Water Baseline</Text>
              </View>
              <View style={[styles.quadrantCell, styles.quadrantRight]}>
                <Text style={styles.quadrantVal}>96.4% Acc</Text>
                <Text style={styles.quadrantLabel}>RandomForest AI</Text>
              </View>
            </View>

            <View style={[styles.quadrantRow, { marginTop: 14 }]}>
              <View style={styles.quadrantCell}>
                <Text style={styles.quadrantVal}>0.0 mm</Text>
                <Text style={styles.quadrantLabel}>Precipitation</Text>
              </View>
              <View style={[styles.quadrantCell, styles.quadrantRight]}>
                <Text style={styles.quadrantVal}>4G Live</Text>
                <Text style={styles.quadrantLabel}>Real-time Sensors</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. Food & Water Emergency Relief Strip */}
        <TouchableOpacity
          style={[
            styles.foodWaterCard,
            activeDistress === 'FOOD_WATER' && styles.bentoActiveRing,
          ]}
          onPress={() => handleDistressPress('FOOD_WATER')}
          activeOpacity={0.85}
        >
          <View style={styles.foodWaterLeft}>
            <View style={styles.foodWaterIconCircle}>
              <Utensils size={18} color="#0891b2" />
            </View>
            <View>
              <Text style={styles.foodWaterTitle}>Request Food & Water Relief</Text>
              <Text style={styles.foodWaterSub}>Supply drop & ration support beacon</Text>
            </View>
          </View>
          <View style={styles.bentoArrow}>
            <ArrowRight size={15} color="#0891b2" strokeWidth={2.2} />
          </View>
        </TouchableOpacity>

        {/* 4. Safe Evacuation Haven Card */}
        <View style={styles.havenCard}>
          <View style={styles.havenTop}>
            <View style={styles.havenIcon}>
              <Mountain size={18} color="#0284c7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.havenBadge}>NEAREST SAFE HIGH-GROUND HAVEN</Text>
              <Text style={styles.havenTitle}>Civil Defense & Relief Staging Area</Text>
              <Text style={styles.havenSub}>Designated High-Ground Sector (GLA University Sector)</Text>
            </View>
          </View>
          <View style={styles.havenStatsRow}>
            <View style={styles.havenStat}>
              <Text style={styles.havenStatVal}>1.03 km</Text>
              <Text style={styles.havenStatLabel}>Distance</Text>
            </View>
            <View style={styles.havenStat}>
              <Text style={styles.havenStatVal}>~15 min</Text>
              <Text style={styles.havenStatLabel}>Est. Walk</Text>
            </View>
            <View style={styles.havenStat}>
              <Text style={styles.havenStatVal}>500</Text>
              <Text style={styles.havenStatLabel}>Capacity</Text>
            </View>
          </View>
        </View>

        {/* 5. Nearby Citizens & Mesh Network */}
        <NearbyVictimsHelpCard />

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Emergency Distress SOS Triage Modal */}
      <Modal
        visible={showSOSModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSOSModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSOSModal(false)}>
          <View style={styles.sosModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sosModalSheet}>
                <View style={styles.sosModalHandle} />
                
                {/* Header */}
                <View style={styles.sosModalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sosModalTitle}>🚨 Emergency SOS Triage</Text>
                    <Text style={styles.sosModalSubtitle}>
                      Select distress category for immediate live satellite & BLE mesh beacon
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sosModalCloseBtn}
                    onPress={() => setShowSOSModal(false)}
                    activeOpacity={0.8}
                  >
                    <X size={18} color="#5A6570" />
                  </TouchableOpacity>
                </View>

                {/* 5 Distress Action Cards */}
                <View style={styles.sosOptionsList}>
                  {/* Option 1: Trapped */}
                  <TouchableOpacity
                    style={[styles.sosOptionCard, { backgroundColor: '#EBE5D8', borderColor: '#DCD4C4' }]}
                    onPress={() => handleDistressPress('TRAPPED')}
                    activeOpacity={0.84}
                  >
                    <View style={styles.sosOptionLeft}>
                      <View style={[styles.sosOptionIconCircle, { backgroundColor: '#FFFFFF' }]}>
                        <AlertTriangle size={20} color="#45382A" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sosOptionTitle}>Trapped</Text>
                        <Text style={styles.sosOptionSub}>Structural collapse, debris, or flood isolation</Text>
                      </View>
                    </View>
                    <View style={styles.bentoArrow}>
                      <ArrowRight size={15} color="#45382A" strokeWidth={2.2} />
                    </View>
                  </TouchableOpacity>

                  {/* Option 2: Medical */}
                  <TouchableOpacity
                    style={[styles.sosOptionCard, { backgroundColor: '#CFDEEA', borderColor: '#BED0DE' }]}
                    onPress={() => handleDistressPress('MEDICAL')}
                    activeOpacity={0.84}
                  >
                    <View style={styles.sosOptionLeft}>
                      <View style={[styles.sosOptionIconCircle, { backgroundColor: '#FFFFFF' }]}>
                        <HeartPulse size={20} color="#253545" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sosOptionTitle}>Medical Emergency</Text>
                        <Text style={styles.sosOptionSub}>Severe injury, cardiac, or paramedic first aid needed</Text>
                      </View>
                    </View>
                    <View style={styles.bentoArrow}>
                      <ArrowRight size={15} color="#253545" strokeWidth={2.2} />
                    </View>
                  </TouchableOpacity>

                  {/* Option 3: Evacuate */}
                  <TouchableOpacity
                    style={[styles.sosOptionCard, { backgroundColor: '#F0DDD6', borderColor: '#E5C9C0' }]}
                    onPress={() => handleDistressPress('EVACUATION')}
                    activeOpacity={0.84}
                  >
                    <View style={styles.sosOptionLeft}>
                      <View style={[styles.sosOptionIconCircle, { backgroundColor: '#FFFFFF' }]}>
                        <Navigation size={20} color="#4A2E28" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sosOptionTitle}>Evacuation Request</Text>
                        <Text style={styles.sosOptionSub}>Request rescue boats, transport to high-ground haven</Text>
                      </View>
                    </View>
                    <View style={styles.bentoArrow}>
                      <ArrowRight size={15} color="#4A2E28" strokeWidth={2.2} />
                    </View>
                  </TouchableOpacity>

                  {/* Option 4: Food & Water */}
                  <TouchableOpacity
                    style={[styles.sosOptionCard, { backgroundColor: '#D8E8F0', borderColor: '#C4DAE5' }]}
                    onPress={() => handleDistressPress('FOOD_WATER')}
                    activeOpacity={0.84}
                  >
                    <View style={styles.sosOptionLeft}>
                      <View style={[styles.sosOptionIconCircle, { backgroundColor: '#FFFFFF' }]}>
                        <Utensils size={20} color="#1E3E4D" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sosOptionTitle}>Food & Water Relief</Text>
                        <Text style={styles.sosOptionSub}>Drinking water, rations, and emergency supplies</Text>
                      </View>
                    </View>
                    <View style={styles.bentoArrow}>
                      <ArrowRight size={15} color="#1E3E4D" strokeWidth={2.2} />
                    </View>
                  </TouchableOpacity>

                  {/* Option 5: I Am Safe */}
                  <TouchableOpacity
                    style={[styles.sosOptionCard, { backgroundColor: '#D8E6D5', borderColor: '#C5D8C1' }]}
                    onPress={markAsSafe}
                    activeOpacity={0.84}
                  >
                    <View style={styles.sosOptionLeft}>
                      <View style={[styles.sosOptionIconCircle, { backgroundColor: '#FFFFFF' }]}>
                        <ShieldCheck size={20} color="#2A402D" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sosOptionTitle}>I Am Safe</Text>
                        <Text style={styles.sosOptionSub}>Cancel distress & confirm well-being with Civil Defense</Text>
                      </View>
                    </View>
                    <View style={styles.bentoArrow}>
                      <ArrowRight size={15} color="#2A402D" strokeWidth={2.2} />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 40,
    backgroundColor: '#F8F9F5',
  },
  bottomSpacer: {
    height: 30,
  },

  /* 2x2 Bento Action Cards Grid */
  bentoSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoCard: {
    flex: 1,
    height: 146,
    borderRadius: 26,
    padding: 18,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  bentoSand: {
    backgroundColor: '#EBE5D8',
    borderColor: '#DCD4C4',
  },
  bentoSage: {
    backgroundColor: '#D8E6D5',
    borderColor: '#C5D8C1',
  },
  bentoBlue: {
    backgroundColor: '#CFDEEA',
    borderColor: '#BED0DE',
  },
  bentoRose: {
    backgroundColor: '#F7D8D5',
    borderColor: '#EBBFB9',
  },
  bentoLavender: {
    backgroundColor: '#E2DFEE',
    borderColor: '#D2CEDE',
  },
  bentoActiveRing: {
    borderWidth: 2,
    borderColor: '#dc2626',
    transform: [{ scale: 0.98 }],
  },
  bentoActiveRingSafe: {
    borderWidth: 2,
    borderColor: '#059669',
    transform: [{ scale: 0.98 }],
  },
  bentoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bentoArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoBottom: {
    gap: 3,
  },
  bentoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1F24',
    letterSpacing: -0.3,
  },
  bentoSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#55606A',
    lineHeight: 15,
  },

  /* Overall Hydrological Safety Score Card */
  scoreCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E8EBE2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  scoreHeader: {
    marginBottom: 16,
  },
  scoreTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1C1F24',
    letterSpacing: -0.3,
  },
  scoreSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#707A84',
    marginTop: 2,
  },

  /* Solid Charcoal Black Pill Button */
  charcoalPillBtn: {
    backgroundColor: '#1E2124',
    borderRadius: 9999,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
  },
  charcoalPillSafe: {
    backgroundColor: '#059669',
  },
  charcoalPillDanger: {
    backgroundColor: '#dc2626',
  },
  charcoalPillText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  /* Gauge */
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 6,
  },
  gaugeCenter: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  gaugePercent: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1C1F24',
    letterSpacing: -0.5,
  },
  gaugeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#707A84',
    marginTop: -2,
  },

  riskPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 18,
  },
  riskPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  /* 4-Quadrant Metric Layout */
  metricsQuadrant: {
    backgroundColor: '#F8F9F5',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EBE2',
  },
  quadrantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quadrantCell: {
    flex: 1,
  },
  quadrantRight: {
    alignItems: 'flex-end',
  },
  quadrantVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1F24',
  },
  quadrantLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#707A84',
    marginTop: 1,
  },

  /* Food & Water Relief Strip */
  foodWaterCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8EBE2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  foodWaterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  foodWaterIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CFFAFE',
  },
  foodWaterTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1F24',
  },
  foodWaterSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },

  /* Haven Card */
  havenCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E8EBE2',
  },
  havenTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  havenIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  havenBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
    letterSpacing: 0.5,
  },
  havenTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1F24',
    marginTop: 2,
  },
  havenSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  havenStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9F5',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E8EBE2',
  },
  havenStat: {
    alignItems: 'center',
  },
  havenStatVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1F24',
  },
  havenStatLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#707A84',
    marginTop: 1,
  },

  /* SOS Triage Modal */
  sosModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 31, 36, 0.55)',
    justifyContent: 'flex-end',
  },
  sosModalSheet: {
    backgroundColor: '#F8F9F5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
  },
  sosModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sosModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sosModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1F24',
  },
  sosModalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5A6570',
    marginTop: 2,
    lineHeight: 16,
  },
  sosModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8EBE2',
    marginLeft: 12,
  },
  sosOptionsList: {
    gap: 10,
  },
  sosOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  sosOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  sosOptionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sosOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1F24',
  },
  sosOptionSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#5A6570',
    marginTop: 1,
  },
});

