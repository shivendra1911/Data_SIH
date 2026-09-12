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
  onClose: () => void;
}> = ({ visible, peers, onClose }) => {
  const [selectedPeer, setSelectedPeer] = useState<MeshPeer | null>(null);
  const [message, setMessage] = useState('');
  const [sectorCitizens, setSectorCitizens] = useState<NearbyCitizen[]>([]);

  useEffect(() => {
    fetchNearbyCitizens().then((list) => {
      if (list && list.length > 0) setSectorCitizens(list);
    });
  }, [visible]);

  const displayPeers: (MeshPeer & { phone?: string })[] =
    peers.length > 0
      ? peers
      : sectorCitizens.map((c) => ({
          id: c.id,
          name: c.name,
          status: (c.status === 'SOS' ? 'SOS' : 'SAFE') as any,
          distanceMeters: c.distance_meters,
          signalStrength: -62,
          hopCount: 1,
          relayedPacketsCount: 0,
          lastSeen: new Date(),
          batteryLevel: c.battery_level,
          phone: c.phone,
        }));

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
  onClose: () => void;
}> = ({ visible, peers, isDisasterConfirmed = false, onClose }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mode, setMode] = useState<'ble' | 'phone'>('ble');
  const [callingPeer, setCallingPeer] = useState<MeshPeer | null>(null);
  const [sectorCitizens, setSectorCitizens] = useState<NearbyCitizen[]>([]);

  useEffect(() => {
    fetchNearbyCitizens().then((list) => {
      if (list && list.length > 0) setSectorCitizens(list);
    });
  }, [visible]);

  const displayPeers: (MeshPeer & { phone?: string })[] =
    peers.length > 0
      ? peers
      : sectorCitizens.map((c) => ({
          id: c.id,
          name: c.name,
          status: (c.status === 'SOS' ? 'SOS' : 'SAFE') as any,
          distanceMeters: c.distance_meters,
          signalStrength: -62,
          hopCount: 1,
          relayedPacketsCount: 0,
          lastSeen: new Date(),
          batteryLevel: c.battery_level,
          phone: c.phone,
        }));

  const handleBLECall = async (peer: MeshPeer) => {
    setCallingPeer(peer);
    await meshEngine.initiateCall(peer.id, peer.name);
    Alert.alert(
      '📡 Calling Over Mesh Intercom...',
      `Sending BLE call request to ${peer.name} (zero internet/cellular needed).\n\nWaiting for peer to accept on their device...`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            meshEngine.endCall(peer.id);
            setCallingPeer(null);
          },
        },
      ]
    );
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
                  <Text style={modalStyles.sectionLabel}>
                    Sector Citizens via BLE Mesh ({displayPeers.length} available):
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
export const MeshScreen: React.FC<MeshScreenProps> = ({ peers, isDisasterConfirmed = false }) => {
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);

  const livePeers = peers.length > 0 ? peers : meshEngine.getConnectedPeers();

  const handleChainReport = () => {
    const hopCount = Math.max(1, livePeers.length);
    Alert.alert(
      'Bluetooth Chain Report',
      `Your signal is hopping through ${hopCount} device(s) to reach the backend.\n\nStrong peers: ${livePeers.filter((p) => p.signalStrength > -70).length}\nWeak peers: ${livePeers.filter((p) => p.signalStrength <= -70).length}`,
    );
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowCallModal(true)}>
            <PhoneCall size={20} color="#fff" />
            <Text style={styles.actionText}>BLE Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#0ea5e9' }]}
            onPress={() => setShowMessageModal(true)}
          >
            <MessageCircle size={20} color="#fff" />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#8b5cf6' }]}
            onPress={handleChainReport}
          >
            <Activity size={20} color="#fff" />
            <Text style={styles.actionText}>Chain Info</Text>
          </TouchableOpacity>
        </View>

        <BluetoothWalkieTalkie />
        <NearbyVictimsHelpCard isDisasterConfirmed={isDisasterConfirmed} />
        <MeshRelayFeed peers={livePeers} />
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Modals */}
      <BLEMessageModal
        visible={showMessageModal}
        peers={livePeers}
        onClose={() => setShowMessageModal(false)}
      />
      <BLECallModal
        visible={showCallModal}
        peers={livePeers}
        isDisasterConfirmed={isDisasterConfirmed}
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
    paddingBottom: 100,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    elevation: 3,
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  bottomPadding: {
    height: 60,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
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
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  sectionLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  peerList: {
    maxHeight: 200,
    marginBottom: 8,
  },
  peerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  peerRowSelected: {
    borderColor: '#0ea5e9',
    backgroundColor: '#0c2d4a',
  },
  peerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  peerInitial: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
  peerName: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 13,
  },
  peerMeta: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  selectedBadge: {
    backgroundColor: '#0ea5e9',
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
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  callBadgeText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 12,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  emptySubText: {
    color: '#475569',
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
    backgroundColor: '#1e293b',
    color: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
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
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeBtnActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  modeBtnActivePhone: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  modeBtnText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  quickDialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  quickDialLabel: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  quickDialNumber: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: 14,
    marginRight: 8,
  },
});
