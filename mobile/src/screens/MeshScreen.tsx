import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
  FlatList,
  TextInput,
  Linking,
  TouchableWithoutFeedback,
} from 'react-native';
import { BluetoothWalkieTalkie } from '../components/BluetoothWalkieTalkie';
import { NearbyVictimsHelpCard } from '../components/NearbyVictimsHelpCard';
import { MeshRelayFeed } from '../components/MeshRelayFeed';
import {
  PhoneCall,
  MessageCircle,
  Activity,
  Radio,
  Phone,
  Bluetooth,
  Send,
  X,
  Mic,
} from 'lucide-react-native';
import { MeshPeer } from '../types';
import { meshEngine } from '../services/bluetoothMesh';
import { fetchNearbyCitizens, NearbyCitizen } from '../services/api';

interface MeshScreenProps {
  peers: MeshPeer[];
  isDisasterConfirmed?: boolean;
  networkMode?: any;
  onInitiateCall?: (peer: any) => void;
  onInitiateGroupCall?: () => void;
  onBack?: () => void;
}

const maskPhone = (phone?: string) => {
  if (!phone) return 'Private';
  const clean = phone.replace(/\s+/g, '');
  if (clean.length < 5) return '••••••';
  return clean.substring(0, 3) + ' ••••• ••' + clean.substring(clean.length - 2);
};

// ─────────────────────────────────────────────
// Modal: BLE Message — show peer list
// ─────────────────────────────────────────────
const BLEMessageModal: React.FC<{
  visible: boolean;
  peers: MeshPeer[];
  initialPeer?: MeshPeer | null;
  onClose: () => void;
}> = ({ visible, peers, initialPeer, onClose }) => {
  const [selectedPeer, setSelectedPeer] = useState<MeshPeer | null>(initialPeer || null);
  const [message, setMessage] = useState('');
  const [sectorCitizens, setSectorCitizens] = useState<NearbyCitizen[]>([]);

  useEffect(() => {
    if (initialPeer) {
      setSelectedPeer(initialPeer);
    }
  }, [initialPeer, visible]);

  useEffect(() => {
    fetchNearbyCitizens().then((list) => {
      if (list && list.length > 0) setSectorCitizens(list);
    });
  }, [visible]);

  const displayPeers: (MeshPeer & { phone?: string })[] = peers;

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!selectedPeer) {
      // Broadcast to all
      await meshEngine.sendChatMessage('You', message.trim());
      Alert.alert('Sent!', `Message broadcast to all ${displayPeers.length} nearby citizens via BLE mesh.`);
    } else {
      await meshEngine.sendChatMessage('You', `[To ${selectedPeer.name}]: ${message.trim()}`);
      Alert.alert('Sent!', `Message sent to ${selectedPeer.name} via BLE mesh.`);
    }
    setMessage('');
    setSelectedPeer(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={modalStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={modalStyles.sheet}>
              {/* Header */}
              <View style={modalStyles.header}>
                <MessageCircle size={18} color="#0ea5e9" />
                <Text style={modalStyles.title}>BLE Message</Text>
                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Text style={modalStyles.sectionLabel}>
                Select Recipient ({displayPeers.length} available):
              </Text>

              {/* Peer List */}
              {displayPeers.length === 0 ? (
                <View style={modalStyles.emptyBox}>
                  <Radio size={24} color="#475569" />
                  <Text style={modalStyles.emptyText}>No peers detected nearby.</Text>
                  <Text style={modalStyles.emptySubText}>
                    Message will be queued and sent when a BLE peer is found.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={displayPeers}
                  keyExtractor={(p) => p.id}
                  style={modalStyles.peerList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        modalStyles.peerRow,
                        selectedPeer?.id === item.id && modalStyles.peerRowSelected,
                      ]}
                      onPress={() =>
                        setSelectedPeer(selectedPeer?.id === item.id ? null : item)
                      }
                      activeOpacity={0.8}
                    >
                      <View style={modalStyles.peerAvatar}>
                        <Text style={modalStyles.peerInitial}>
                          {item.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={modalStyles.peerName}>{item.name}</Text>
                        <Text style={modalStyles.peerMeta}>
                          {item.distanceMeters ?? '?'}m away • {item.signalStrength} dBm • {item.status}
                        </Text>
                      </View>
                      {selectedPeer?.id === item.id && (
                        <View style={modalStyles.selectedBadge}>
                          <Text style={modalStyles.selectedBadgeText}>Selected</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                />
              )}

              {/* Broadcast hint */}
              <TouchableOpacity
                style={[modalStyles.peerRow, !selectedPeer && modalStyles.peerRowSelected]}
                onPress={() => setSelectedPeer(null)}
                activeOpacity={0.8}
              >
                <View style={[modalStyles.peerAvatar, { backgroundColor: '#1d4ed8' }]}>
                  <Radio size={14} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.peerName}>📡 Broadcast to ALL ({displayPeers.length})</Text>
                  <Text style={modalStyles.peerMeta}>Sends emergency mesh packet to everyone</Text>
                </View>
                {!selectedPeer && (
                  <View style={[modalStyles.selectedBadge, { backgroundColor: '#1d4ed8' }]}>
                    <Text style={modalStyles.selectedBadgeText}>Default</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Message input */}
              <View style={modalStyles.inputRow}>
                <TextInput
                  style={modalStyles.input}
                  placeholder={
                    selectedPeer
                      ? `Message to ${selectedPeer.name}...`
                      : 'Broadcast message...'
                  }
                  placeholderTextColor="#64748b"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                />
                <TouchableOpacity
                  style={[modalStyles.sendBtn, !message.trim() && { opacity: 0.4 }]}
                  onPress={handleSend}
                  disabled={!message.trim()}
                  activeOpacity={0.8}
                >
                  <Send size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// Modal: BLE / Phone Call options
// ─────────────────────────────────────────────
const BLECallModal: React.FC<{
  visible: boolean;
  peers: MeshPeer[];
  isDisasterConfirmed?: boolean;
  onInitiateCall?: (peer: any) => void;
  onInitiateGroupCall?: () => void;
  onClose: () => void;
}> = ({ visible, peers, isDisasterConfirmed = false, onInitiateCall, onInitiateGroupCall, onClose }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mode, setMode] = useState<'ble' | 'phone'>('ble');
  const [callingPeer, setCallingPeer] = useState<MeshPeer | null>(null);
  const [sectorCitizens, setSectorCitizens] = useState<NearbyCitizen[]>([]);

  useEffect(() => {
    fetchNearbyCitizens().then((list) => {
      if (list && list.length > 0) setSectorCitizens(list);
    });
  }, [visible]);

  const displayPeers: (MeshPeer & { phone?: string })[] = peers;

  const handleBLECall = async (peer: MeshPeer) => {
    onClose();
    if (onInitiateCall) {
      onInitiateCall(peer);
    } else {
      await meshEngine.initiateCall(peer.id, peer.name);
    }
  };

  const handlePhoneCall = (targetNum?: string, isCitizen: boolean = false) => {
    if (isCitizen && !isDisasterConfirmed) {
      Alert.alert(
        '🔒 Privacy Protected',
        'Citizen direct phone numbers are only unlocked during a confirmed disaster or verified emergency. Use the offline BLE Walkie-Talkie to contact this citizen.'
      );
      return;
    }
    const num = (targetNum || phoneNumber).trim();
    if (!num) {
      Alert.alert('Enter number', 'Please enter a phone number to call.');
      return;
    }
    Linking.openURL(`tel:${num}`).catch(() =>
      Alert.alert('Cannot Call', 'Unable to open the dialer.')
    );
    setPhoneNumber('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={modalStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={modalStyles.sheet}>
              {/* Header */}
              <View style={modalStyles.header}>
                <PhoneCall size={18} color="#10b981" />
                <Text style={modalStyles.title}>Emergency Voice & Phone Call</Text>
                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Mode Toggle */}
              <View style={modalStyles.modeToggle}>
                <TouchableOpacity
                  style={[modalStyles.modeBtn, mode === 'ble' && modalStyles.modeBtnActive]}
                  onPress={() => setMode('ble')}
                  activeOpacity={0.8}
                >
                  <Bluetooth size={14} color={mode === 'ble' ? '#fff' : '#64748b'} />
                  <Text
                    style={[modalStyles.modeBtnText, mode === 'ble' && { color: '#fff' }]}
                  >
                    BLE Call (Mesh/No Net)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.modeBtn, mode === 'phone' && modalStyles.modeBtnActivePhone]}
                  onPress={() => setMode('phone')}
                  activeOpacity={0.8}
                >
                  <Phone size={14} color={mode === 'phone' ? '#fff' : '#64748b'} />
                  <Text
                    style={[modalStyles.modeBtnText, mode === 'phone' && { color: '#fff' }]}
                  >
                    Phone / Cellular Call
                  </Text>
                </TouchableOpacity>
              </View>

              {/* BLE Peer List */}
              {mode === 'ble' && (
                <>
                  {/* Group Emergency Call Action */}
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#450a0a',
                      borderWidth: 1.5,
                      borderColor: '#ef4444',
                      borderRadius: 14,
                      padding: 12,
                      marginBottom: 12,
                      gap: 12,
                    }}
                    onPress={() => {
                      onClose();
                      if (onInitiateGroupCall) onInitiateGroupCall();
                      else meshEngine.initiateGroupCall();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' }}>
                      <Radio size={16} color="#ffffff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fca5a5', fontSize: 13, fontWeight: '800' }}>
                        🚨 CALL ALL NEARBY NODES (GROUP)
                      </Text>
                      <Text style={{ color: '#fecaca', fontSize: 11 }}>
                        Emergency broadcast ring to all {displayPeers.length} connected devices
                      </Text>
                    </View>
                    <PhoneCall size={16} color="#ef4444" />
                  </TouchableOpacity>

                  <Text style={modalStyles.sectionLabel}>
                    Or Call Single Peer (1-to-1 Intercom):
                  </Text>
                  {displayPeers.length === 0 ? (
                    <View style={modalStyles.emptyBox}>
                      <Bluetooth size={24} color="#475569" />
                      <Text style={modalStyles.emptyText}>No peers in range.</Text>
                      <Text style={modalStyles.emptySubText}>
                        Switch to "Phone / Cellular Call" mode.
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={displayPeers}
                      keyExtractor={(p) => p.id}
                      style={modalStyles.peerList}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={modalStyles.peerRow}
                          onPress={() => handleBLECall(item)}
                          activeOpacity={0.8}
                        >
                          <View style={[modalStyles.peerAvatar, { backgroundColor: '#064e3b' }]}>
                            <Mic size={14} color="#34d399" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={modalStyles.peerName}>{item.name}</Text>
                            <Text style={modalStyles.peerMeta}>
                              {item.distanceMeters ?? '?'}m away • {item.signalStrength} dBm • {item.status}
                            </Text>
                          </View>
                          <View style={modalStyles.callBadge}>
                            <PhoneCall size={14} color="#34d399" />
                            <Text style={modalStyles.callBadgeText}>Walkie</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </>
              )}

              {/* Phone Number Mode */}
              {mode === 'phone' && (
                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  <Text style={modalStyles.sectionLabel}>
                    Enter phone number (uses cellular network):
                  </Text>
                  <View style={modalStyles.inputRow}>
                    <TextInput
                      style={modalStyles.input}
                      placeholder="e.g. +91 98765 43210"
                      placeholderTextColor="#64748b"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                    />
                    <TouchableOpacity
                      style={[
                        modalStyles.sendBtn,
                        { backgroundColor: '#10b981' },
                        !phoneNumber.trim() && { opacity: 0.4 },
                      ]}
                      onPress={() => handlePhoneCall()}
                      disabled={!phoneNumber.trim()}
                      activeOpacity={0.8}
                    >
                      <Phone size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Sector Citizens Direct Call List */}
                  <Text style={[modalStyles.sectionLabel, { marginTop: 12 }]}>
                    Sector Citizens Direct Phone:
                  </Text>
                  {!isDisasterConfirmed && (
                    <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 8 }}>
                      🔒 Masked for privacy (unlocked automatically during confirmed disaster)
                    </Text>
                  )}
                  {sectorCitizens.map((cit) => (
                    <TouchableOpacity
                      key={cit.id}
                      style={modalStyles.quickDialRow}
                      onPress={() => handlePhoneCall(cit.phone, true)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={modalStyles.quickDialLabel}>{cit.name} ({cit.location_name})</Text>
                        <Text style={[modalStyles.quickDialNumber, !isDisasterConfirmed && { color: '#94a3b8' }]}>
                          {isDisasterConfirmed ? cit.phone : maskPhone(cit.phone)}
                        </Text>
                      </View>
                      <Phone size={16} color={isDisasterConfirmed ? '#10b981' : '#64748b'} />
                    </TouchableOpacity>
                  ))}

                  {/* Quick Dial Emergency Numbers */}
                  <Text style={[modalStyles.sectionLabel, { marginTop: 12 }]}>
                    Emergency Helplines:
                  </Text>
                  {[
                    { label: '🚨 NDRF Disaster Helpline', number: '9711077372' },
                    { label: '🏥 Ambulance', number: '108' },
                    { label: '🚒 Fire & Rescue', number: '101' },
                    { label: '🚓 Police Control Room', number: '100' },
                    { label: '☎️ Uttarakhand Disaster Mgmt', number: '1078' },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.number}
                      style={modalStyles.quickDialRow}
                      onPress={() => handlePhoneCall(item.number)}
                      activeOpacity={0.8}
                    >
                      <Text style={modalStyles.quickDialLabel}>{item.label}</Text>
                      <Text style={modalStyles.quickDialNumber}>{item.number}</Text>
                      <Phone size={14} color="#10b981" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// Main MeshScreen
// ─────────────────────────────────────────────
export const MeshScreen: React.FC<MeshScreenProps> = ({
  peers: initialPeers,
  isDisasterConfirmed = false,
  onInitiateCall,
  onInitiateGroupCall,
}) => {
  const [localPeers, setLocalPeers] = useState<MeshPeer[]>(initialPeers || []);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [selectedMessagePeer, setSelectedMessagePeer] = useState<MeshPeer | null>(null);

  useEffect(() => {
    const unsub = (meshEngine as any).subscribePeers
      ? (meshEngine as any).subscribePeers((newPeers: MeshPeer[]) => {
          setLocalPeers([...newPeers]);
        })
      : undefined;

    // Auto-trigger fresh scan on entering screen
    meshEngine.triggerManualScan().catch(() => {});

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const livePeers = localPeers;

  const handleManualScan = async () => {
    setIsScanning(true);
    try {
      await meshEngine.triggerManualScan();
      const updated = meshEngine.getConnectedPeers();
      setLocalPeers([...updated]);
    } catch (e) {
      console.warn('Manual scan error:', e);
    } finally {
      setTimeout(() => setIsScanning(false), 3000);
    }
  };

  const handleChainReport = () => {
    const hopCount = Math.max(1, livePeers.length);
    Alert.alert(
      'Bluetooth Chain Report',
      `Your signal is hopping through ${hopCount} device(s) to reach the backend.\n\nActive BLE peers: ${livePeers.length}\nStrong signal (> -70 dBm): ${livePeers.filter((p) => p.signalStrength > -70).length}\nWeak signal (<= -70 dBm): ${livePeers.filter((p) => p.signalStrength <= -70).length}`,
    );
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Clean Neutral Action Row with Explicit Group Call */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#dc2626' }]}
            onPress={() => {
              if (onInitiateGroupCall) onInitiateGroupCall();
              else meshEngine.initiateGroupCall();
            }}
            activeOpacity={0.84}
          >
            <Radio size={16} color="#ffffff" strokeWidth={2.2} />
            <Text style={[styles.actionText, { color: '#ffffff', fontWeight: '800' }]}>🚨 Group Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => setShowCallModal(true)}
            activeOpacity={0.84}
          >
            <PhoneCall size={16} color="#ffffff" strokeWidth={2.2} />
            <Text style={[styles.actionText, { color: '#ffffff' }]}>1-to-1 Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setSelectedMessagePeer(null);
              setShowMessageModal(true);
            }}
            activeOpacity={0.84}
          >
            <MessageCircle size={16} color="#1C1F24" strokeWidth={2} />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleManualScan}
            activeOpacity={0.84}
          >
            <Activity size={16} color={isScanning ? "#10b981" : "#1C1F24"} strokeWidth={2} />
            <Text style={styles.actionText}>{isScanning ? "Scanning..." : "Scan Peers"}</Text>
          </TouchableOpacity>
        </View>

        <BluetoothWalkieTalkie
          peers={livePeers}
          onCallPeer={(peer) => {
            if (onInitiateCall) onInitiateCall(peer);
            else {
              meshEngine.initiateCall(peer.id, peer.name);
            }
          }}
          onGroupEmergencyCall={() => {
            if (onInitiateGroupCall) onInitiateGroupCall();
            else {
              meshEngine.initiateGroupCall();
            }
          }}
          onOpenChatWithPeer={(peer) => {
            setSelectedMessagePeer(peer);
            setShowMessageModal(true);
          }}
        />
        <NearbyVictimsHelpCard
          isDisasterConfirmed={isDisasterConfirmed}
          onCallVictim={(peer) => {
            if (onInitiateCall) onInitiateCall(peer);
            else {
              meshEngine.initiateCall(peer.id, peer.name);
            }
          }}
          onMessageVictim={(peer) => {
            setSelectedMessagePeer(peer);
            setShowMessageModal(true);
          }}
        />
        <MeshRelayFeed peers={livePeers} />
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Modals */}
      <BLEMessageModal
        visible={showMessageModal}
        peers={livePeers}
        initialPeer={selectedMessagePeer}
        onClose={() => {
          setShowMessageModal(false);
          setSelectedMessagePeer(null);
        }}
      />
      <BLECallModal
        visible={showCallModal}
        peers={livePeers}
        isDisasterConfirmed={isDisasterConfirmed}
        onInitiateCall={onInitiateCall}
        onInitiateGroupCall={onInitiateGroupCall}
        onClose={() => setShowCallModal(false)}
      />
    </>
  );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
    backgroundColor: '#F8F9F5',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EBE2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  actionBtnPrimary: {
    backgroundColor: '#1E2124',
    borderColor: '#1E2124',
  },
  actionText: {
    fontWeight: '800',
    fontSize: 12,
    color: '#1C1F24',
  },
  bottomPadding: {
    height: 40,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 31, 36, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F8F9F5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    flex: 1,
    color: '#1C1F24',
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EBE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    color: '#5A6570',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  peerList: {
    maxHeight: 220,
    marginBottom: 8,
  },
  peerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E8EBE2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  peerRowSelected: {
    borderColor: '#0284c7',
    backgroundColor: '#F0F9FF',
  },
  peerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  peerInitial: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
  peerName: {
    color: '#1C1F24',
    fontWeight: '800',
    fontSize: 13,
  },
  peerMeta: {
    color: '#707A84',
    fontSize: 11,
    marginTop: 2,
  },
  selectedBadge: {
    backgroundColor: '#1E2124',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  callBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D8E6D5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  callBadgeText: {
    color: '#2A402D',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EBE2',
  },
  emptyText: {
    color: '#1C1F24',
    fontSize: 13,
    fontWeight: '800',
  },
  emptySubText: {
    color: '#707A84',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    color: '#1C1F24',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E8EBE2',
  },
  sendBtn: {
    backgroundColor: '#1E2124',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EBE2',
  },
  modeBtnActive: {
    backgroundColor: '#1E2124',
    borderColor: '#1E2124',
  },
  modeBtnActivePhone: {
    backgroundColor: '#1E2124',
    borderColor: '#1E2124',
  },
  modeBtnText: {
    color: '#5A6570',
    fontSize: 11,
    fontWeight: '700',
  },
  quickDialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E8EBE2',
    gap: 8,
  },
  quickDialLabel: {
    flex: 1,
    color: '#1C1F24',
    fontSize: 13,
    fontWeight: '700',
  },
  quickDialNumber: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 14,
    marginRight: 8,
  },
});
