import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  PermissionsAndroid,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Shield, Bluetooth, Wifi, MapPin, Mic, Settings, X, CheckCircle2, AlertCircle } from 'lucide-react-native';
import {
  getAppPermissionsStatus,
  requestIgnoreBatteryOptimizations,
  AppPermissionsStatus,
} from '../services/gattServerBridge';
import { meshEngine } from '../services/bluetoothMesh';

const ONBOARDING_SHOWN_KEY = '@neernetra_permissions_onboarding_shown';

interface PermissionContextType {
  status: AppPermissionsStatus | null;
  hasAllPermissions: boolean;
  isChecking: boolean;
  isModalVisible: boolean;
  setIsModalVisible: (visible: boolean) => void;
  checkPermissions: () => Promise<boolean>;
  requestAllPermissions: () => Promise<boolean>;
  openAppSettings: () => void;
}

const PermissionContext = createContext<PermissionContextType>({
  status: null,
  hasAllPermissions: false,
  isChecking: true,
  isModalVisible: false,
  setIsModalVisible: () => {},
  checkPermissions: async () => false,
  requestAllPermissions: async () => false,
  openAppSettings: () => {},
});

export const usePermissions = () => useContext(PermissionContext);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AppPermissionsStatus | null>(null);
  const [hasAllPermissions, setHasAllPermissions] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      setHasAllPermissions(true);
      setIsChecking(false);
      return true;
    }

    try {
      setIsChecking(true);
      const permStatus = await getAppPermissionsStatus();
      if (permStatus) {
        setStatus(permStatus);

        // Core required permissions for off-grid mesh functionality
        const coreGranted =
          permStatus.fineLocation &&
          permStatus.bluetooth &&
          permStatus.recordAudio &&
          permStatus.nearbyWifi;

        // Eliminate false positive popups: core permissions are strictly required, background/battery are optimal
        const allSatisfied =
          coreGranted &&
          permStatus.backgroundLocation &&
          permStatus.isIgnoringBatteryOptimizations;

        setHasAllPermissions(allSatisfied);

        // If core permissions are missing (declined/revoked), or if first run, show informative popup.
        // Never show fake popups when core permissions are satisfied and onboarding has been shown.
        const onboardingShown = await AsyncStorage.getItem(ONBOARDING_SHOWN_KEY);
        if (!onboardingShown || !coreGranted) {
          setIsModalVisible(true);
        } else {
          setIsModalVisible(false);
        }

        return coreGranted;
      }
      return false;
    } catch (err) {
      console.warn('[PermissionContext] checkPermissions error:', err);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const requestAllPermissions = async (): Promise<boolean> => {
    try {
      // 1. Request Android runtime permissions via meshEngine helper
      await meshEngine.requestAndroidPermissions();

      // 2. Sequential background location request on Android 11+ (API 30+)
      if (Platform.OS === 'android' && Number(Platform.Version) >= 30) {
        try {
          const fineLocationGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          if (fineLocationGranted) {
            await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
          }
        } catch (bgErr) {
          console.warn('[PermissionContext] Background location request error:', bgErr);
        }
      }

      // 3. Request background battery optimizations only if not already granted
      if (status && !status.isIgnoringBatteryOptimizations) {
        await requestIgnoreBatteryOptimizations().catch(() => {});
      }

      await AsyncStorage.setItem(ONBOARDING_SHOWN_KEY, 'true');

      // 4. Re-verify actual granted status
      const updated = await checkPermissions();
      setIsModalVisible(false);
      return updated;
    } catch (err) {
      console.warn('[PermissionContext] requestAllPermissions error:', err);
      return false;
    }
  };

  const openAppSettings = () => {
    Linking.openSettings().catch(() => {});
  };

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return (
    <PermissionContext.Provider
      value={{
        status,
        hasAllPermissions,
        isChecking,
        isModalVisible,
        setIsModalVisible,
        checkPermissions,
        requestAllPermissions,
        openAppSettings,
      }}
    >
      {children}

      {/* Informative Permissions Explanation Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.iconCircle}>
                <Shield size={24} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Off-Grid Mesh Permissions</Text>
                <Text style={styles.modalSubtitle}>Required for life-saving disaster coordination</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
              <Text style={styles.introText}>
                NeerNetra operates completely without cell towers or internet. To form direct peer-to-peer walkie-talkie connections and locate victims, the following permissions are essential:
              </Text>

              {/* Permission Item: Bluetooth Low Energy */}
              <View style={styles.permCard}>
                <View style={[styles.permIconCircle, { backgroundColor: '#eff6ff' }]}>
                  <Bluetooth size={18} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.permTitleRow}>
                    <Text style={styles.permName}>Bluetooth Low Energy Mesh</Text>
                    {status?.bluetooth ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                      <AlertCircle size={16} color="#f59e0b" />
                    )}
                  </View>
                  <Text style={styles.permDesc}>
                    Discovers nearby phones within 50m and relays emergency packets multi-hop across devices.
                  </Text>
                </View>
              </View>

              {/* Permission Item: Wi-Fi Direct / Local Wi-Fi */}
              <View style={styles.permCard}>
                <View style={[styles.permIconCircle, { backgroundColor: '#ecfdf5' }]}>
                  <Wifi size={18} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.permTitleRow}>
                    <Text style={styles.permName}>Wi-Fi Direct (250m Long-Range)</Text>
                    {status?.nearbyWifi ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                      <AlertCircle size={16} color="#f59e0b" />
                    )}
                  </View>
                  <Text style={styles.permDesc}>
                    Transmits zero-cellular high-speed walkie-talkie audio and rescue broadcasts up to 250m.
                  </Text>
                </View>
              </View>

              {/* Permission Item: Location */}
              <View style={styles.permCard}>
                <View style={[styles.permIconCircle, { backgroundColor: '#fef3c7' }]}>
                  <MapPin size={18} color="#d97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.permTitleRow}>
                    <Text style={styles.permName}>Location & Offline Haven Radar</Text>
                    {status?.fineLocation ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                      <AlertCircle size={16} color="#f59e0b" />
                    )}
                  </View>
                  <Text style={styles.permDesc}>
                    Places you on the offline safety map, alerts you of landslide danger zones, and routes to shelters.
                  </Text>
                </View>
              </View>

              {/* Permission Item: Microphone */}
              <View style={styles.permCard}>
                <View style={[styles.permIconCircle, { backgroundColor: '#f3e8ff' }]}>
                  <Mic size={18} color="#7c3aed" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.permTitleRow}>
                    <Text style={styles.permName}>Microphone (Audio Intercom)</Text>
                    {status?.recordAudio ? (
                      <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                      <AlertCircle size={16} color="#f59e0b" />
                    )}
                  </View>
                  <Text style={styles.permDesc}>
                    Required for push-to-talk voice recording during walkie-talkie emergency calls.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={requestAllPermissions}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Grant Permissions</Text>
              </TouchableOpacity>

              <View style={styles.secondaryActionsRow}>
                <TouchableOpacity
                  style={styles.settingsBtn}
                  onPress={openAppSettings}
                  activeOpacity={0.8}
                >
                  <Settings size={14} color="#1e293b" />
                  <Text style={styles.settingsBtnText}>Open Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dismissBtn}
                  onPress={() => {
                    AsyncStorage.setItem(ONBOARDING_SHOWN_KEY, 'true').catch(() => {});
                    setIsModalVisible(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dismissBtnText}>I'll Allow Later</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </PermissionContext.Provider>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    maxHeight: 360,
    marginBottom: 16,
  },
  introText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 14,
  },
  permCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  permIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  permTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  permName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  permDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
  },
  actionsContainer: {
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  settingsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  settingsBtnText: {
    color: '#1e293b',
    fontSize: 12,
    fontWeight: '700',
  },
  dismissBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dismissBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
});
