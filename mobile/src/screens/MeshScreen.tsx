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
  Wifi,
  Trash2,
} from 'lucide-react-native';
import { MeshPeer } from '../types';
import { meshEngine, isMockOrFalsePeer } from '../services/bluetoothMesh';
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

const getHopBadge = (peer: MeshPeer) => {
  const hops = peer.hopCount || 1;
  const dist = peer.distanceMeters ?? (hops === 1 ? 45 : hops * 200);
  const viaNode = peer.nextHop ? ` via ${peer.nextHop}` : '';
  const distText = dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${dist}m`;
  const isIdle = peer.status === 'IDLE' || peer.status === 'PREVIOUSLY_SEEN';
  const statusSuffix = isIdle ? ' • Idle' : '';

  if (isIdle) {
    return {
      label: `⚪ ${hops <= 1 ? 'Direct' : `${hops} hops`}${viaNode} • ~${distText}${statusSuffix}`,
      bg: '#f1f5f9',
      border: '#94a3b8',
      text: '#475569',
    };
  }

  if (hops <= 1) {
    return {
      label: `🟢 Direct (Wi-Fi/BLE) • ~${distText}`,
      bg: '#ecfdf5',
      border: '#10b981',
      text: '#047857',
    };
  } else if (hops === 2) {
    return {
      label: `🟡 Relayed • 2 hops${viaNode} • ~${distText}`,
      bg: '#fefce8',
      border: '#eab308',
      text: '#a16207',
    };
  } else {
    return {
      label: `🔵 Relayed • ${hops} hops${viaNode} • ~${distText}`,
      bg: '#eff6ff',
      border: '#3b82f6',
      text: '#1d4ed8',
    };
  }
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
  const [radioMode, setRadioMode] = useState<'wifi' | 'ble'>('wifi');

  useEffect(() => {
    if (initialPeer) {
      setSelectedPeer(initialPeer);
    }
  }, [initialPeer, visible]);

  useEffect(() => {
    fetchNearbyCitizens().then((list) => {
      if (list && list.length > 0) {
        setSectorCitizens(list.filter((c) => !isMockOrFalsePeer(c.id, c.name)));
      }
    });
  }, [visible]);

  const displayPeers: (MeshPeer & { phone?: string })[] = peers.filter((p) => !isMockOrFalsePeer(p.id, p.name));

  const handleSend = async () => {
    if (!message.trim()) return;
    const text = message.trim();
    if (!selectedPeer) {
      // Broadcast to all
      if (radioMode === 'wifi') {
        await meshEngine.sendWifiDirectMessage(text);
        Alert.alert('📶 Sent via Wi-Fi Direct', `Message broadcast over Wi-Fi Direct socket mesh (250m direct range, 2km+ via relays).`);
      } else {
        await meshEngine.sendChatMessage('You', text);
        Alert.alert('🔵 Sent via BLE', `Message broadcast over Bluetooth Low Energy mesh (50m range).`);
      }
    } else {
      const fullText = `[To ${selectedPeer.name}]: ${text}`;
      if (radioMode === 'wifi') {
        await meshEngine.sendWifiDirectMessage(fullText, selectedPeer.id);
        Alert.alert('📶 Sent via Wi-Fi Direct', `Message sent to ${selectedPeer.name} over Wi-Fi Direct (250m range).`);
      } else {
        await meshEngine.sendChatMessage('You', fullText, selectedPeer.id);
        Alert.alert('🔵 Sent via BLE', `Message sent to ${selectedPeer.name} over BLE (50m range).`);
      }
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
                <MessageCircle size={18} color="#059669" />
                <Text style={modalStyles.title}>Offline Mesh Message</Text>
                <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Radio Mode Selector Toggle */}
              <View style={modalStyles.modeToggle}>
                <TouchableOpacity
                  style={[modalStyles.modeBtn, radioMode === 'wifi' && modalStyles.modeBtnActiveWifi]}
                  onPress={() => setRadioMode('wifi')}
                  activeOpacity={0.8}
                >
                  <Wifi size={13} color={radioMode === 'wifi' ? '#fff' : '#059669'} />
                  <Text
                    style={[modalStyles.modeBtnText, radioMode === 'wifi' && { color: '#fff', fontWeight: '800' }]}
                  >
                    Wi-Fi Direct (250m)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[modalStyles.modeBtn, radioMode === 'ble' && modalStyles.modeBtnActiveBle]}
                  onPress={() => setRadioMode('ble')}
                  activeOpacity={0.8}
                >
                  <Bluetooth size={13} color={radioMode === 'ble' ? '#fff' : '#2563eb'} />
                  <Text
                    style={[modalStyles.modeBtnText, radioMode === 'ble' && { color: '#fff', fontWeight: '800' }]}
                  >
                    Bluetooth BLE (50m)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Informative Radio Banner */}
              {radioMode === 'wifi' ? (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ecfdf5',
                  borderWidth: 1,
                  borderColor: '#a7f3d0',
                  borderRadius: 12,
                  padding: 8,
                  marginBottom: 10,
                  gap: 8,
                }}>
                  <Wifi size={14} color="#059669" />
                  <Text style={{ flex: 1, color: '#065f46', fontSize: 11, fontWeight: '600' }}>
                    <Text style={{ fontWeight: '800' }}>Wi-Fi Direct Mode:</Text> 250m high-speed socket mesh (port 8765) with zero internet or cellular network.
                  </Text>
                </View>
              ) : (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#eff6ff',
                  borderWidth: 1,
                  borderColor: '#bfdbfe',
                  borderRadius: 12,
                  padding: 8,
                  marginBottom: 10,
                  gap: 8,
                }}>
                  <Bluetooth size={14} color="#2563eb" />
                  <Text style={{ flex: 1, color: '#1e40af', fontSize: 11, fontWeight: '600' }}>
                    <Text style={{ fontWeight: '800' }}>BLE Low Energy Mode:</Text> Conserves battery for close-range (under 50m) communication.
                  </Text>
                </View>
              )}

              <Text style={modalStyles.sectionLabel}>
                Select Recipient ({displayPeers.length} available):
              </Text>

              {/* Peer List */}
              {displayPeers.length === 0 ? (
                <View style={modalStyles.emptyBox}>
                  {radioMode === 'wifi' ? (
                    <Wifi size={24} color="#059669" />
                  ) : (
                    <Bluetooth size={24} color="#2563eb" />
                  )}
                  <Text style={modalStyles.emptyText}>No mesh peers detected nearby.</Text>
                  <Text style={modalStyles.emptySubText}>
                    {radioMode === 'wifi'
                      ? 'Message will broadcast over local Wi-Fi Direct socket (250m range).'
                      : 'Message will be queued and sent when a BLE peer is in range.'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={displayPeers}
                  keyExtractor={(p) => p.id}
                  style={modalStyles.peerList}
                  renderItem={({ item }) => {
                    const hop = getHopBadge(item);
                    return (
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
                        <View style={[modalStyles.peerAvatar, { backgroundColor: radioMode === 'wifi' ? '#059669' : '#1d4ed8' }]}>
                          {radioMode === 'wifi' ? (
                            <Wifi size={14} color="#fff" />
                          ) : (
                            <Bluetooth size={14} color="#fff" />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={modalStyles.peerName}>{item.name}</Text>
                          <View style={[modalStyles.peerHopBadge, { backgroundColor: hop.bg, borderColor: hop.border }]}>
                            <Text style={[modalStyles.peerHopBadgeText, { color: hop.text }]}>
                              {radioMode === 'wifi' ? '📶 Wi-Fi Direct' : '🔵 BLE'} • {hop.label}
                            </Text>
                          </View>
                          <Text style={modalStyles.peerMeta}>
                            {item.signalStrength} dBm • {item.status || 'SAFE'}
                          </Text>
                        </View>
                        {selectedPeer?.id === item.id && (
                          <View style={[modalStyles.selectedBadge, { backgroundColor: radioMode === 'wifi' ? '#059669' : '#1d4ed8' }]}>
                            <Text style={modalStyles.selectedBadgeText}>Selected</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              )}

              {/* Broadcast hint */}
              <TouchableOpacity
                style={[modalStyles.peerRow, !selectedPeer && modalStyles.peerRowSelected]}
                onPress={() => setSelectedPeer(null)}
                activeOpacity={0.8}
              >
                <View style={[modalStyles.peerAvatar, { backgroundColor: radioMode === 'wifi' ? '#059669' : '#1d4ed8' }]}>
                  {radioMode === 'wifi' ? (
                    <Wifi size={14} color="#fff" />
                  ) : (
                    <Radio size={14} color="#fff" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.peerName}>
                    {radioMode === 'wifi' ? '📶 Wi-Fi Broadcast to ALL' : '🔵 BLE Broadcast to ALL'} ({displayPeers.length})
                  </Text>
                  <Text style={modalStyles.peerMeta}>
                    {radioMode === 'wifi'
                      ? 'Transmits high-speed packet over Wi-Fi Direct (250m range)'
                      : 'Sends BLE mesh broadcast packet to everyone nearby'}
                  </Text>
                </View>
                {!selectedPeer && (
                  <View style={[modalStyles.selectedBadge, { backgroundColor: radioMode === 'wifi' ? '#059669' : '#1d4ed8' }]}>
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
                      ? `${radioMode === 'wifi' ? '📶 Wi-Fi' : '🔵 BLE'} to ${selectedPeer.name}...`
                      : `${radioMode === 'wifi' ? '📶 Wi-Fi Broadcast (250m)...' : '🔵 BLE Broadcast (50m)...'}`
                  }
                  placeholderTextColor="#64748b"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                />
                <TouchableOpacity
                  style={[
                    modalStyles.sendBtn,
                    radioMode === 'wifi' ? { backgroundColor: '#059669' } : { backgroundColor: '#2563eb' },
                    !message.trim() && { opacity: 0.4 },
                  ]}
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
  const [mode, setMode] = useState<'wifi' | 'ble' | 'phone'>('wifi');
  const [callingPeer, setCallingPeer] = useState<MeshPeer | null>(null);
  const [sectorCitizens, setSectorCitizens] = useState<NearbyCitizen[]>([]);

  useEffect(() => {
    fetchNearbyCitizens().then((list) => {
      if (list && list.length > 0) {
        setSectorCitizens(list.filter((c) => !isMockOrFalsePeer(c.id, c.name)));
      }
    });
  }, [visible]);

  const displayPeers: (MeshPeer & { phone?: string })[] = peers.filter((p) => !isMockOrFalsePeer(p.id, p.name));

  const handleWifiCall = (peer: MeshPeer) => {
    onClose();
    if (onInitiateCall) {
      onInitiateCall(peer);
    }
    meshEngine.initiateWifiDirectCall(peer.id, peer.name).catch(() => {});
  };

  const handleBLECall = (peer: MeshPeer) => {
    onClose();
    if (onInitiateCall) {
      onInitiateCall(peer);
    } else {
      meshEngine.initiateCall(peer.id, peer.name).catch(() => {});
    }
  };

  const handlePhoneCall = (targetNum?: string, isCitizen: boolean = false) => {
    if (isCitizen && !isDisasterConfirmed) {
      Alert.alert(
        '🔒 Privacy Protected',
        'Citizen direct phone numbers are only unlocked during a confirmed disaster or verified emergency. Use the offline BLE or Wi-Fi Walkie-Talkie to contact this citizen.'
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

              {/* 3-Mode Radio Selector Toggle */}
              <View style={modalStyles.modeToggle}>
                <TouchableOpacity
                  style={[modalStyles.modeBtn, mode === 'wifi' && modalStyles.modeBtnActiveWifi]}
                  onPress={() => setMode('wifi')}
                  activeOpacity={0.8}
                >
                  <Wifi size={13} color={mode === 'wifi' ? '#fff' : '#059669'} />
                  <Text
                    style={[modalStyles.modeBtnText, mode === 'wifi' && { color: '#fff', fontWeight: '800' }]}
                  >
                    Wi-Fi Call (250m)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[modalStyles.modeBtn, mode === 'ble' && modalStyles.modeBtnActiveBle]}
                  onPress={() => setMode('ble')}
                  activeOpacity={0.8}
                >
                  <Bluetooth size={13} color={mode === 'ble' ? '#fff' : '#2563eb'} />
                  <Text
                    style={[modalStyles.modeBtnText, mode === 'ble' && { color: '#fff', fontWeight: '800' }]}
                  >
                    BLE Call (50m)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[modalStyles.modeBtn, mode === 'phone' && modalStyles.modeBtnActivePhone]}
                  onPress={() => setMode('phone')}
                  activeOpacity={0.8}
                >
                  <Phone size={13} color={mode === 'phone' ? '#fff' : '#64748b'} />
                  <Text
                    style={[modalStyles.modeBtnText, mode === 'phone' && { color: '#fff', fontWeight: '800' }]}
                  >
                    Cellular
                  </Text>
                </TouchableOpacity>
              </View>

              {/* MODE 1: Wi-Fi Calling (250m+) */}
              {mode === 'wifi' && (
                <>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#ecfdf5',
                    borderWidth: 1,
                    borderColor: '#a7f3d0',
                    borderRadius: 12,
                    padding: 9,
                    marginBottom: 10,
                    gap: 8,
                  }}>
                    <Wifi size={15} color="#059669" />
                    <Text style={{ flex: 1, color: '#065f46', fontSize: 11, fontWeight: '600', lineHeight: 15 }}>
                      <Text style={{ fontWeight: '800' }}>Offline Wi-Fi Calling Active:</Text> High-speed voice via Wi-Fi Aware NAN & P2P hotspot. 250m per direct hop (2km+ via mesh relays) with zero cell network!
                    </Text>
                  </View>

                  {/* Group Emergency Call Action */}
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#064e3b',
                      borderWidth: 1.5,
                      borderColor: '#10b981',
                      borderRadius: 14,
                      padding: 12,
                      marginBottom: 12,
                      gap: 12,
                    }}
                    onPress={() => {
                      onClose();
                      if (onInitiateGroupCall) {
                        onInitiateGroupCall();
                      }
                      meshEngine.initiateWifiDirectCall('GROUP_CALL', 'ALL NEARBY CITIZENS');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' }}>
                      <Wifi size={16} color="#ffffff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#6ee7b7', fontSize: 13, fontWeight: '800' }}>
                        📶 WI-FI CALL ALL NEARBY CITIZENS
                      </Text>
                      <Text style={{ color: '#a7f3d0', fontSize: 11 }}>
                        Emergency broadcast ring to all {displayPeers.length} connected devices
                      </Text>
                    </View>
                    <PhoneCall size={16} color="#34d399" />
                  </TouchableOpacity>

                  <Text style={modalStyles.sectionLabel}>
                    Call Single Peer Over Wi-Fi (250m):
                  </Text>
                  {displayPeers.length === 0 ? (
                    <View style={modalStyles.emptyBox}>
                      <Wifi size={24} color="#059669" />
                      <Text style={modalStyles.emptyText}>No Wi-Fi mesh peers in range.</Text>
                      <Text style={modalStyles.emptySubText}>
                        Keep Wi-Fi ON. Nodes within 250m will appear automatically.
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={displayPeers}
                      keyExtractor={(p) => p.id}
                      style={modalStyles.peerList}
                      renderItem={({ item }) => {
                        const hop = getHopBadge(item);
                        return (
                          <TouchableOpacity
                            style={modalStyles.peerRow}
                            onPress={() => handleWifiCall(item)}
                            activeOpacity={0.8}
                          >
                            <View style={[modalStyles.peerAvatar, { backgroundColor: '#059669' }]}>
                              <Wifi size={15} color="#ffffff" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={modalStyles.peerName}>{item.name}</Text>
                              <View style={[modalStyles.peerHopBadge, { backgroundColor: '#ecfdf5', borderColor: '#10b981' }]}>
                                <Text style={[modalStyles.peerHopBadgeText, { color: '#047857' }]}>
                                  📶 Wi-Fi Direct • {hop.label}
                                </Text>
                              </View>
                              <Text style={modalStyles.peerMeta}>
                                {item.signalStrength} dBm • {item.status || 'SAFE'}
                              </Text>
                            </View>
                            <View style={[modalStyles.callBadge, { backgroundColor: '#059669' }]}>
                              <PhoneCall size={13} color="#ffffff" />
                              <Text style={[modalStyles.callBadgeText, { color: '#ffffff' }]}>Wi-Fi Call</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      }}
                    />
                  )}
                </>
              )}

              {/* MODE 2: BLE Low Energy Call (50m) */}
              {mode === 'ble' && (
                <>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#eff6ff',
                    borderWidth: 1,
                    borderColor: '#bfdbfe',
                    borderRadius: 12,
                    padding: 9,
                    marginBottom: 10,
                    gap: 8,
                  }}>
                    <Bluetooth size={15} color="#2563eb" />
                    <Text style={{ flex: 1, color: '#1e40af', fontSize: 11, fontWeight: '600', lineHeight: 15 }}>
                      <Text style={{ fontWeight: '800' }}>BLE Low Energy Mode:</Text> Conserves battery for close-range (under 50m) communication.
                    </Text>
                  </View>

                  {/* Group Emergency Call Action */}
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#1e3a8a',
                      borderWidth: 1.5,
                      borderColor: '#3b82f6',
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
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' }}>
                      <Radio size={16} color="#ffffff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#93c5fd', fontSize: 13, fontWeight: '800' }}>
                        🔵 BLE CALL ALL NEARBY NODES (GROUP)
                      </Text>
                      <Text style={{ color: '#bfdbfe', fontSize: 11 }}>
                        Emergency broadcast ring to all {displayPeers.length} connected devices
                      </Text>
                    </View>
                    <PhoneCall size={16} color="#60a5fa" />
                  </TouchableOpacity>

                  <Text style={modalStyles.sectionLabel}>
                    Call Single Peer Over BLE (50m):
                  </Text>
                  {displayPeers.length === 0 ? (
                    <View style={modalStyles.emptyBox}>
                      <Bluetooth size={24} color="#475569" />
                      <Text style={modalStyles.emptyText}>No BLE peers in range.</Text>
                      <Text style={modalStyles.emptySubText}>
                        Keep Bluetooth ON on both devices.
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={displayPeers}
                      keyExtractor={(p) => p.id}
                      style={modalStyles.peerList}
                      renderItem={({ item }) => {
                        const hop = getHopBadge(item);
                        return (
                          <TouchableOpacity
                            style={modalStyles.peerRow}
                            onPress={() => handleBLECall(item)}
                            activeOpacity={0.8}
                          >
                            <View style={[modalStyles.peerAvatar, { backgroundColor: '#1d4ed8' }]}>
                              <Bluetooth size={15} color="#ffffff" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={modalStyles.peerName}>{item.name}</Text>
                              <View style={[modalStyles.peerHopBadge, { backgroundColor: hop.bg, borderColor: hop.border }]}>
                                <Text style={[modalStyles.peerHopBadgeText, { color: hop.text }]}>{hop.label}</Text>
                              </View>
                              <Text style={modalStyles.peerMeta}>
                                {item.signalStrength} dBm • {item.status || 'SAFE'}
                              </Text>
                            </View>
                            <View style={[modalStyles.callBadge, { backgroundColor: '#2563eb' }]}>
                              <PhoneCall size={13} color="#ffffff" />
                              <Text style={[modalStyles.callBadgeText, { color: '#ffffff' }]}>BLE Call</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      }}
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
    meshEngine.clearTestPeers().catch(() => {});
    const unsub = (meshEngine as any).subscribePeers
      ? (meshEngine as any).subscribePeers((newPeers: MeshPeer[]) => {
          setLocalPeers(newPeers.filter((p) => !isMockOrFalsePeer(p.id, p.name)));
        })
      : undefined;

    // Auto-trigger fresh scan on entering screen
    meshEngine.triggerManualScan().catch(() => {});

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const livePeers = localPeers.filter((p) => !isMockOrFalsePeer(p.id, p.name));

  const handleClearPeers = () => {
    Alert.alert(
      'Clean Mesh Peers',
      'Purge all simulated test nodes and cached offline routes so only active nearby phones appear?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purge Test Nodes',
          style: 'destructive',
          onPress: async () => {
            await meshEngine.clearTestPeers();
            const clean = meshEngine.getConnectedPeers();
            setLocalPeers([...clean]);
            Alert.alert('✅ Mesh Cleaned', 'Test nodes purged. Ready for physical peer discovery.');
          },
        },
      ]
    );
  };

  const handleManualScan = async () => {
    setIsScanning(true);
    try {
      await meshEngine.clearTestPeers();
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
      'Dual-Radio Mesh Chain Report',
      `Your signal is hopping through ${hopCount} device(s) over BLE & Wi-Fi Direct to reach the backend.\n\nActive mesh peers: ${livePeers.length}\nDual-Radio Range: Up to 250m per direct hop, 2km+ via multi-hop relay.`,
    );
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Dual-Radio Status Banner */}
        <TouchableOpacity style={styles.radioBanner} onPress={handleChainReport} activeOpacity={0.8}>
          <View style={styles.radioBannerLeft}>
            <View style={styles.radioIconsRow}>
              <Bluetooth size={14} color="#3b82f6" />
              <Wifi size={14} color="#10b981" />
            </View>
            <View>
              <Text style={styles.radioBannerTitle}>Dual-Radio Long-Range Mesh Active</Text>
              <Text style={styles.radioBannerSub}>BLE Discovery + Wi-Fi Direct / Aware P2P Socket</Text>
            </View>
          </View>
          <View style={styles.radioBannerBadge}>
            <Text style={styles.radioBannerBadgeText}>250m / hop</Text>
          </View>
        </TouchableOpacity>

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
              meshEngine.initiateCall(peer.id, peer.name).catch(() => {});
            }
          }}
          onGroupEmergencyCall={() => {
            if (onInitiateGroupCall) onInitiateGroupCall();
            else {
              meshEngine.initiateGroupCall().catch(() => {});
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
              meshEngine.initiateCall(peer.id, peer.name).catch(() => {});
            }
          }}
          onMessageVictim={(peer) => {
            setSelectedMessagePeer(peer);
            setShowMessageModal(true);
          }}
        />

        {/* Mesh Management / Clear Peer Cache */}
        <View style={styles.meshManageRow}>
          <Text style={styles.meshManageText}>
            {livePeers.length === 0
              ? 'Zero test nodes • Ready for real phones'
              : `${livePeers.length} genuine device(s) nearby`}
          </Text>
          <TouchableOpacity
            style={styles.clearPeersBtn}
            onPress={handleClearPeers}
            activeOpacity={0.7}
          >
            <Trash2 size={12} color="#dc2626" />
            <Text style={styles.clearPeersBtnText}>Clear Peers</Text>
          </TouchableOpacity>
        </View>

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
  radioBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  radioBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  radioIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    padding: 6,
    borderRadius: 10,
  },
  radioBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  radioBannerSub: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  radioBannerBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  radioBannerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  meshManageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F8FAF6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  meshManageText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  clearPeersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  clearPeersBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
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
  peerHopBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginVertical: 2,
  },
  peerHopBadgeText: {
    fontSize: 9,
    fontWeight: '800',
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
    gap: 5,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EBE2',
  },
  modeBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  modeBtnActiveWifi: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  modeBtnActiveBle: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  modeBtnActivePhone: {
    backgroundColor: '#475569',
    borderColor: '#475569',
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
