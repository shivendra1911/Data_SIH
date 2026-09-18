import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
  Vibration,
  Dimensions,
} from 'react-native';
import {
  User,
  Mail,
  Phone,
  Droplet,
  HeartPulse,
  Save,
  X,
  ShieldCheck,
  Radio,
  MapPin,
  FileText,
  PhoneCall,
  CheckCircle,
  Sparkles,
} from 'lucide-react-native';
import { UserProfile, getUserProfile, saveUserProfile } from '../services/userProfileService';
import { meshEngine } from '../services/bluetoothMesh';

interface ProfileSidebarDrawerProps {
  visible: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: 'status' | 'mesh' | 'map' | 'directives') => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const ProfileSidebarDrawer: React.FC<ProfileSidebarDrawerProps> = ({
  visible,
  onClose,
  onNavigateTab,
}) => {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    bloodGroup: 'O+',
    emergencyContact: '',
    medicalNotes: '',
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      getUserProfile().then((p) => {
        setProfile(p);
        // If profile name is still default Citizen, prompt editing
        if (!p.name || p.name.startsWith('Citizen dev_') || p.name.startsWith('Citizen [') || p.name === 'Citizen') {
          setIsEditing(true);
        }
      });
      setSavedSuccess(false);
    }
  }, [visible]);

  const handleSave = async () => {
    if (!profile.name.trim()) {
      Alert.alert('Name Required', 'Please enter your real full name so rescue teams and nearby citizens can identify you.');
      return;
    }

    try {
      const updated = await saveUserProfile(profile);
      setProfile(updated);
      setIsEditing(false);
      setSavedSuccess(true);
      Vibration.vibrate(40);

      // Update mesh engine's local broadcast name so nearby phones see real name immediately
      if ((meshEngine as any).updateLocalUserName) {
        (meshEngine as any).updateLocalUserName(updated.name);
      }

      setTimeout(() => setSavedSuccess(false), 3000);
      Alert.alert('Profile Saved!', `Your profile name "${updated.name}" is now active and will be used across all offline BLE mesh chats, calls, and rescue alerts.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.drawerSheet}>
          {/* Drawer Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(profile.name)}</Text>
              </View>
              <View style={styles.headerTitles}>
                <Text style={styles.drawerTitle} numberOfLines={1}>
                  {profile.name || 'Set Your Name'}
                </Text>
                <Text style={styles.drawerSubtitle} numberOfLines={1}>
                  {profile.email || 'Citizen Emergency Profile'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Identity Broadcast Alert Notice */}
            <View style={styles.broadcastNoticeCard}>
              <View style={styles.broadcastIconBox}>
                <Radio size={16} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.broadcastTitle}>Off-Grid Mesh Identity</Text>
                <Text style={styles.broadcastDesc}>
                  Your name is transmitted directly to nearby devices over BLE radio. No generic "Peer" names are used.
                </Text>
              </View>
            </View>

            {/* Profile Card / Edit Form */}
            <View style={styles.profileSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  {isEditing ? 'EDIT YOUR PROFILE' : 'YOUR CITIZEN PROFILE'}
                </Text>
                {!isEditing ? (
                  <TouchableOpacity
                    style={styles.editToggleBtn}
                    onPress={() => setIsEditing(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.editToggleText}>Edit Details</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.cancelEditBtn}
                    onPress={() => setIsEditing(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelEditText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isEditing ? (
                /* Edit Form */
                <View style={styles.formCard}>
                  {/* Full Name */}
                  <Text style={styles.inputLabel}>Full Name (Displayed in Mesh)</Text>
                  <View style={styles.inputBox}>
                    <User size={18} color="#0ea5e9" />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor="#94a3b8"
                      value={profile.name}
                      onChangeText={(t) => setProfile({ ...profile, name: t })}
                    />
                  </View>

                  {/* Email / Gmail */}
                  <Text style={styles.inputLabel}>Gmail / Email</Text>
                  <View style={styles.inputBox}>
                    <Mail size={18} color="#0ea5e9" />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. rahul.sharma@gmail.com"
                      placeholderTextColor="#94a3b8"
                      value={profile.email}
                      onChangeText={(t) => setProfile({ ...profile, email: t })}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Phone */}
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.inputBox}>
                    <Phone size={18} color="#0ea5e9" />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. +91 98765 43210"
                      placeholderTextColor="#94a3b8"
                      value={profile.phone}
                      onChangeText={(t) => setProfile({ ...profile, phone: t })}
                      keyboardType="phone-pad"
                    />
                  </View>

                  {/* Blood Group */}
                  <Text style={styles.inputLabel}>Blood Group</Text>
                  <View style={styles.bloodRow}>
                    {BLOOD_GROUPS.map((bg) => {
                      const selected = profile.bloodGroup === bg;
                      return (
                        <TouchableOpacity
                          key={bg}
                          style={[styles.bloodPill, selected && styles.bloodPillActive]}
                          onPress={() => setProfile({ ...profile, bloodGroup: bg })}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.bloodText, selected && styles.bloodTextActive]}>
                            {bg}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Emergency Contact */}
                  <Text style={styles.inputLabel}>Emergency Contact Number</Text>
                  <View style={styles.inputBox}>
                    <HeartPulse size={18} color="#ef4444" />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. +91 91234 56789 (Kin/Doctor)"
                      placeholderTextColor="#94a3b8"
                      value={profile.emergencyContact}
                      onChangeText={(t) => setProfile({ ...profile, emergencyContact: t })}
                      keyboardType="phone-pad"
                    />
                  </View>

                  {/* Medical Notes */}
                  <Text style={styles.inputLabel}>Medical Conditions / Allergies</Text>
                  <View style={[styles.inputBox, { height: 70, alignItems: 'flex-start' }]}>
                    <TextInput
                      style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                      placeholder="e.g. Diabetic, allergic to penicillin, asthmatic"
                      placeholderTextColor="#94a3b8"
                      value={profile.medicalNotes}
                      onChangeText={(t) => setProfile({ ...profile, medicalNotes: t })}
                      multiline
                    />
                  </View>

                  {/* Save Button */}
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    activeOpacity={0.84}
                  >
                    <Save size={18} color="#ffffff" />
                    <Text style={styles.saveBtnText}>SAVE PROFILE & UPDATE MESH</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* View Summary Card */
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <User size={16} color="#475569" />
                    <Text style={styles.summaryLabel}>Name:</Text>
                    <Text style={styles.summaryValue}>{profile.name || 'Not set'}</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Mail size={16} color="#475569" />
                    <Text style={styles.summaryLabel}>Gmail:</Text>
                    <Text style={styles.summaryValue}>{profile.email || 'Not set'}</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Phone size={16} color="#475569" />
                    <Text style={styles.summaryLabel}>Phone:</Text>
                    <Text style={styles.summaryValue}>{profile.phone || 'Not set'}</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Droplet size={16} color="#ef4444" />
                    <Text style={styles.summaryLabel}>Blood Group:</Text>
                    <View style={styles.bloodBadge}>
                      <Text style={styles.bloodBadgeText}>{profile.bloodGroup || 'O+'}</Text>
                    </View>
                  </View>

                  {profile.emergencyContact ? (
                    <View style={styles.summaryRow}>
                      <HeartPulse size={16} color="#ef4444" />
                      <Text style={styles.summaryLabel}>Emergency Contact:</Text>
                      <Text style={styles.summaryValue}>{profile.emergencyContact}</Text>
                    </View>
                  ) : null}

                  {profile.medicalNotes ? (
                    <View style={styles.medicalBox}>
                      <Text style={styles.medicalLabel}>Medical Notes:</Text>
                      <Text style={styles.medicalText}>{profile.medicalNotes}</Text>
                    </View>
                  ) : null}

                  {savedSuccess && (
                    <View style={styles.successBanner}>
                      <CheckCircle size={16} color="#059669" />
                      <Text style={styles.successText}>Profile active across offline mesh!</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Quick Navigation Drawer Items */}
            <View style={styles.navSection}>
              <Text style={styles.sectionTitle}>QUICK NAVIGATION</Text>

              <TouchableOpacity
                style={styles.navRow}
                onPress={() => {
                  onClose();
                  onNavigateTab?.('status');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.navIconBox, { backgroundColor: '#f0fdf4' }]}>
                  <ShieldCheck size={18} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.navTitle}>Live Disaster Status</Text>
                  <Text style={styles.navSubtitle}>Flood & water level radar</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navRow}
                onPress={() => {
                  onClose();
                  onNavigateTab?.('mesh');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.navIconBox, { backgroundColor: '#eff6ff' }]}>
                  <Radio size={18} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.navTitle}>Decentralized Walkie & Mesh</Text>
                  <Text style={styles.navSubtitle}>Communicate off-grid without cellular</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navRow}
                onPress={() => {
                  onClose();
                  onNavigateTab?.('map');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.navIconBox, { backgroundColor: '#fef3c7' }]}>
                  <MapPin size={18} color="#d97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.navTitle}>Offline GIS Evacuation Map</Text>
                  <Text style={styles.navSubtitle}>Vector tiles & high ground havens</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navRow}
                onPress={() => {
                  onClose();
                  onNavigateTab?.('directives');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.navIconBox, { backgroundColor: '#faf5ff' }]}>
                  <FileText size={18} color="#9333ea" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.navTitle}>Directives & Alerts</Text>
                  <Text style={styles.navSubtitle}>Civil defense & NDRF evacuation protocols</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Emergency Helplines Card */}
            <View style={styles.helplineCard}>
              <Text style={styles.helplineTitle}>🚨 24x7 Emergency Helplines</Text>
              <Text style={styles.helplineRow}>• NDRF Disaster Control: 9711077372</Text>
              <Text style={styles.helplineRow}>• State Emergency Helpline: 1070 / 1078</Text>
              <Text style={styles.helplineRow}>• National Emergency Number: 112</Text>
              <Text style={styles.helplineRow}>• Ambulance: 108 | Fire: 101 | Police: 100</Text>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  drawerSheet: {
    width: '85%',
    maxWidth: 380,
    backgroundColor: '#F8F9F5',
    height: '100%',
    paddingTop: 48,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAE0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  headerTitles: {
    flex: 1,
  },
  drawerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1F24',
  },
  drawerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  broadcastNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  broadcastIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcastTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065f46',
  },
  broadcastDesc: {
    fontSize: 11,
    color: '#047857',
    lineHeight: 15,
    marginTop: 1,
  },
  profileSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
  },
  editToggleBtn: {
    backgroundColor: '#1E2124',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  editToggleText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  cancelEditBtn: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  cancelEditText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9F5',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#1C1F24',
    paddingVertical: 0,
  },
  bloodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bloodPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  bloodPillActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  bloodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  bloodTextActive: {
    color: '#ffffff',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
    marginTop: 6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    width: 80,
  },
  summaryValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1F24',
  },
  bloodBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  bloodBadgeText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '900',
  },
  medicalBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  medicalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
    marginBottom: 2,
  },
  medicalText: {
    fontSize: 12,
    color: '#92400e',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    padding: 8,
    borderRadius: 8,
  },
  successText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  navSection: {
    marginBottom: 20,
    gap: 8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  navIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1F24',
  },
  navSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  helplineCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  helplineTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  helplineRow: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
});
