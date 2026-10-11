import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MeshChatMessage, MeshPeer } from '../types';
import { meshEngine, isMockOrFalsePeer } from '../services/bluetoothMesh';
import { startVoiceRecording, stopVoiceRecording, playPttTone } from '../services/gattServerBridge';
import { Radio, Mic, MicOff, Send, WifiOff, Volume2, Shield, Phone, MessageSquare, Wifi, Bluetooth } from 'lucide-react-native';

interface BluetoothWalkieTalkieProps {
  peers?: MeshPeer[];
  onCallPeer?: (peer: MeshPeer) => void;
  onOpenChatWithPeer?: (peer: MeshPeer) => void;
  onGroupEmergencyCall?: () => void;
}

export const BluetoothWalkieTalkie: React.FC<BluetoothWalkieTalkieProps> = ({
  peers: propPeers,
  onCallPeer,
  onOpenChatWithPeer,
  onGroupEmergencyCall,
}) => {
  const [messages, setMessages] = useState<MeshChatMessage[]>(meshEngine.getMeshChatMessages());
  const [inputMsg, setInputMsg] = useState<string>('');
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [activePeerName, setActivePeerName] = useState<string | null>(null);
  const [selectedRadio, setSelectedRadio] = useState<'wifi' | 'ble'>('wifi');
  const [peers, setPeers] = useState<MeshPeer[]>(propPeers || meshEngine.getConnectedPeers());
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const displayPeers = peers.filter((p) => !isMockOrFalsePeer(p.id, p.name));

  useEffect(() => {
    if (propPeers) {
      setPeers(propPeers);
    } else {
      const unsub = (meshEngine as any).subscribePeers
        ? (meshEngine as any).subscribePeers((updated: MeshPeer[]) => setPeers([...updated]))
        : undefined;
      return () => {
        if (unsub) unsub();
      };
    }
  }, [propPeers]);

  useEffect(() => {
    const prevMsgHandler = meshEngine.onMessageReceived;
    meshEngine.onMessageReceived = (msg) => {
      setMessages([...meshEngine.getMeshChatMessages()]);
      if (prevMsgHandler) prevMsgHandler(msg);
    };

    return () => {
      meshEngine.onMessageReceived = prevMsgHandler;
    };
  }, []);

  const handlePttPressIn = async () => {
    try {
      playPttTone('start').catch(() => {});
      setIsTransmitting(true);
      setVoiceNotice('🎙️ Recording...');
      await startVoiceRecording();
    } catch (e) {
      console.warn('[WalkieTalkie] PTT press in error:', e);
    }
  };

  const handlePttPressOut = async () => {
    try {
      setIsTransmitting(false);
      const audio = await stopVoiceRecording();
      if (audio && audio.length > 0) {
        setVoiceNotice(`📡 Sent ${(audio.length * 0.75 / 1024).toFixed(1)} KB`);
        playPttTone('roger').catch(() => {});
        const targetId = activePeerName ? (displayPeers.find((p) => p.name === activePeerName)?.id || 'BROADCAST') : 'BROADCAST';
        await meshEngine.sendVoiceBurst(targetId, audio, targetId === 'BROADCAST' || targetId === 'GROUP_CALL');
        setTimeout(() => setVoiceNotice(null), 2000);
      } else {
        setVoiceNotice('Hold >=1s to record');
        setTimeout(() => setVoiceNotice(null), 1500);
      }
    } catch (e) {
      console.warn('[WalkieTalkie] PTT press out error:', e);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMsg.trim()) return;
    const text = inputMsg.trim();
    setInputMsg('');
    try {
      if (selectedRadio === 'wifi') {
        await meshEngine.sendWifiDirectMessage(text);
      } else {
        await meshEngine.sendChatMessage('You', text);
      }
      setMessages([...meshEngine.getMeshChatMessages()]);
    } catch (e) {
      Alert.alert('Send Failed', 'Could not send message. Please ensure radio is active.');
    }
  };

  const handleStartWalkieTalkie = (peer: MeshPeer) => {
    if (isCalling && activePeerName === peer.name) {
      setIsCalling(false);
      setActivePeerName(null);
      meshEngine.endCall(peer.id).catch(() => {});
    } else {
      setIsCalling(true);
      setActivePeerName(peer.name);
      if (onCallPeer) {
        onCallPeer(peer);
      }
      if (selectedRadio === 'wifi') {
        meshEngine.initiateWifiDirectCall(peer.id, peer.name).catch(() => {});
        Alert.alert(
          '📶 Wi-Fi Direct Call Sent',
          `Calling ${peer.name} over Wi-Fi Direct (250m direct range, 2km+ via multi-hop mesh).\n\nZero cellular network required.\nWaiting for peer to accept.`
        );
      } else {
        meshEngine.initiateCall(peer.id, peer.name).catch(() => {});
        Alert.alert(
          '🔵 Bluetooth Mesh Call Sent',
          `Calling ${peer.name} over Bluetooth Low Energy (50m range).\n\nBattery-saving mesh intercom.\nWaiting for peer to accept.`
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Radio size={20} color="#60a5fa" />
          <Text style={styles.headerTitle}>DUAL-RADIO WALKIE-TALKIE (BLE + WI-FI DIRECT)</Text>
        </View>
        <View style={styles.offlineTag}>
          <WifiOff size={12} color="#fbbf24" />
          <Text style={styles.offlineTagText}>No Cellular Needed</Text>
        </View>
      </View>

      {/* Active Radio Selector: Wi-Fi Direct 250m vs Bluetooth BLE 50m */}
      <View style={styles.radioSelectorContainer}>
        <TouchableOpacity
          style={[styles.radioTab, selectedRadio === 'wifi' && styles.radioTabActiveWifi]}
          onPress={() => setSelectedRadio('wifi')}
          activeOpacity={0.8}
        >
          <Wifi size={13} color={selectedRadio === 'wifi' ? '#ffffff' : '#059669'} />
          <Text style={[styles.radioTabText, selectedRadio === 'wifi' && styles.radioTabTextActive]}>
            📶 Wi-Fi Direct (250m)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.radioTab, selectedRadio === 'ble' && styles.radioTabActiveBle]}
          onPress={() => setSelectedRadio('ble')}
          activeOpacity={0.8}
        >
          <Bluetooth size={13} color={selectedRadio === 'ble' ? '#ffffff' : '#2563eb'} />
          <Text style={[styles.radioTabText, selectedRadio === 'ble' && styles.radioTabTextActive]}>
            🔵 Bluetooth BLE (50m)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Walkie Talkie Voice Channel Bar */}
      {isCalling && (
        <View style={styles.voiceCallBar}>
          <View style={styles.pulseDot} />
          <Volume2 size={18} color="#34d399" />
          <View style={{ flex: 1 }}>
            <Text style={styles.callText} numberOfLines={1}>
              LIVE [{selectedRadio === 'wifi' ? '📶 WI-FI 250m' : '🔵 BLE 50m'}]: <Text style={styles.peerNameText}>{activePeerName}</Text>
            </Text>
            {voiceNotice && <Text style={styles.voiceNoticeText}>{voiceNotice}</Text>}
          </View>
          <TouchableOpacity
            style={[styles.pttBtn, isTransmitting && styles.pttBtnActive]}
            onPressIn={handlePttPressIn}
            onPressOut={handlePttPressOut}
            activeOpacity={0.7}
          >
            <Mic size={13} color="#ffffff" />
            <Text style={styles.pttBtnText}>{isTransmitting ? 'TALKING...' : 'HOLD PTT'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.endCallBtn}
            onPress={() => {
              setIsCalling(false);
              setActivePeerName(null);
              meshEngine.endCall('ALL').catch(() => {});
            }}
            activeOpacity={0.7}
          >
            <MicOff size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Group Emergency Broadcast Call Button */}
      <TouchableOpacity
        style={[
          styles.groupCallBanner,
          selectedRadio === 'wifi' && {
            backgroundColor: '#064e3b',
            borderColor: '#10b981',
            shadowColor: '#10b981',
          }
        ]}
        onPress={() => {
          if (selectedRadio === 'wifi') {
            if (onGroupEmergencyCall) {
              onGroupEmergencyCall();
            }
            meshEngine.initiateWifiDirectCall('GROUP_CALL', 'ALL NEARBY CITIZENS');
            Alert.alert(
              '📶 Wi-Fi Direct Group Call Sent',
              `Emergency broadcast ring sent over Wi-Fi Direct (250m range) to all ${displayPeers.length} nearby devices.`
            );
          } else {
            if (onGroupEmergencyCall) {
              onGroupEmergencyCall();
            } else {
              meshEngine.initiateGroupCall();
            }
          }
        }}
        activeOpacity={0.85}
      >
        <View style={[styles.groupCallIconCircle, selectedRadio === 'wifi' && { backgroundColor: '#059669' }]}>
          {selectedRadio === 'wifi' ? (
            <Wifi size={16} color="#ffffff" />
          ) : (
            <Phone size={16} color="#ffffff" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.groupCallTitle, selectedRadio === 'wifi' && { color: '#6ee7b7' }]}>
            {selectedRadio === 'wifi' ? '📶 WI-FI CALL ALL NODES (250m RANGE)' : '🚨 GROUP EMERGENCY CALL (ALL NODES)'}
          </Text>
          <Text style={[styles.groupCallSub, selectedRadio === 'wifi' && { color: '#a7f3d0' }]}>
            {selectedRadio === 'wifi'
              ? 'Broadcasts emergency voice ring to all phones over Wi-Fi Direct with zero cellular network'
              : 'Rings all nearby phones simultaneously for urgent disaster coordination'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Connected Bluetooth & Wi-Fi Peers List */}
      <View style={styles.peersSection}>
        <Text style={styles.subTitle}>
          Nearby Mesh Nodes ({displayPeers.length} Active • {selectedRadio === 'wifi' ? 'Wi-Fi 250m' : 'BLE 50m'}):
        </Text>
        <FlatList
          data={displayPeers}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyPeersBox}>
              <Radio size={16} color="#60a5fa" />
              <View>
                <Text style={styles.emptyPeersText}>
                  {selectedRadio === 'wifi'
                    ? 'Scanning for Wi-Fi Direct & Mesh peers (250m)...'
                    : 'Scanning for nearby BLE peers (50m)...'}
                </Text>
                <Text style={styles.emptyPeersSub}>
                  Keep Wi-Fi & Bluetooth ON for maximum 250m range
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
              <View
                style={[
                  styles.peerCard,
                  isCalling && activePeerName === item.name && styles.peerCardActive,
                ]}
              >
                <View style={styles.peerCardTop}>
                  <View style={[styles.peerIconCircle, selectedRadio === 'wifi' && { borderColor: '#10b981' }]}>
                    {selectedRadio === 'wifi' ? (
                      <Wifi size={13} color="#059669" />
                    ) : (
                      <Mic size={14} color="#60a5fa" />
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 120 }}>
                    <Text style={styles.peerName} numberOfLines={1}>{item.name}</Text>
                    <View style={[
                      styles.peerHopBadge,
                      {
                        backgroundColor: (!item.hopCount || item.hopCount <= 1) ? '#ecfdf5' : item.hopCount === 2 ? '#fefce8' : '#eff6ff',
                        borderColor: (!item.hopCount || item.hopCount <= 1) ? '#10b981' : item.hopCount === 2 ? '#eab308' : '#3b82f6',
                      }
                    ]}>
                      <Text style={[
                        styles.peerHopBadgeText,
                        {
                          color: (!item.hopCount || item.hopCount <= 1) ? '#047857' : item.hopCount === 2 ? '#a16207' : '#1d4ed8',
                        }
                      ]}>
                        {(() => {
                          const hops = item.hopCount || 1;
                          const rawDist = item.distanceMeters && item.distanceMeters > 0
                            ? item.distanceMeters
                            : (hops <= 1 ? (selectedRadio === 'wifi' ? 150 : 45) : hops * 200);
                          const distLabel = rawDist >= 1000
                            ? `~${(rawDist / 1000).toFixed(1)} km`
                            : `~${Math.round(rawDist)}m`;
                          if (hops <= 1) {
                            return selectedRadio === 'wifi' ? `📶 Direct Wi-Fi • ${distLabel}` : `🟢 Direct BLE • ${distLabel}`;
                          } else if (hops === 2) {
                            return `🟡 Relayed • 2 hops${item.nextHop ? ` via ${item.nextHop}` : ''} • ${distLabel}`;
                          } else {
                            return `🔵 Relayed • ${hops} hops${item.nextHop ? ` via ${item.nextHop}` : ''} • ${distLabel}`;
                          }
                        })()}
                      </Text>
                    </View>
                    <Text style={styles.peerDist}>
                      {item.signalStrength} dBm
                    </Text>
                  </View>
                </View>

                {/* Explicit Quick Actions: Chat & Call */}
                <View style={styles.peerActionRow}>
                  <TouchableOpacity
                    style={styles.peerChatBtn}
                    onPress={() => {
                      if (onOpenChatWithPeer) {
                        onOpenChatWithPeer(item);
                      } else {
                        setInputMsg(`[To ${item.name}]: `);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <MessageSquare size={11} color="#0f172a" />
                    <Text style={styles.peerChatBtnText}>Chat</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.peerCallBtn,
                      selectedRadio === 'wifi' ? { backgroundColor: '#059669' } : { backgroundColor: '#2563eb' }
                    ]}
                    onPress={() => {
                      if (selectedRadio === 'wifi') {
                        if (onCallPeer) {
                          onCallPeer(item);
                        }
                        if (meshEngine.initiateWifiDirectCall) {
                          meshEngine.initiateWifiDirectCall(item.id, item.name).catch(() => {});
                        } else {
                          meshEngine.initiateCall(item.id, item.name).catch(() => {});
                        }
                        Alert.alert(
                          '📶 Wi-Fi Direct Call Sent',
                          `Calling ${item.name} over Wi-Fi Direct (250m range).\n\nZero cellular network required.\nWaiting for peer to accept.`
                        );
                      } else {
                        if (onCallPeer) {
                          onCallPeer(item);
                        } else {
                          handleStartWalkieTalkie(item);
                        }
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    {selectedRadio === 'wifi' ? (
                      <>
                        <Wifi size={11} color="#ffffff" />
                        <Text style={styles.peerCallBtnText}>Wi-Fi Call</Text>
                      </>
                    ) : (
                      <>
                        <Bluetooth size={11} color="#ffffff" />
                        <Text style={styles.peerCallBtnText}>BLE Call</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
      </View>

      {/* Offline Mesh Messages Feed */}
      <View style={styles.chatFeed}>
        <Text style={styles.subTitle}>Mesh Broadcast Chat:</Text>
        {messages.map((item) => {
          const myId = (meshEngine as any).getMyDeviceId ? (meshEngine as any).getMyDeviceId() : '';
          const isMe = item.senderName === 'You' || (Boolean(myId) && item.senderId === myId);
          return (
            <View
              key={item.id}
              style={[
                styles.msgBubble,
                isMe ? styles.myMsg : styles.peerMsg,
              ]}
            >
              <View style={styles.msgHeader}>
                <Text style={[styles.senderName, isMe ? styles.mySenderName : styles.peerSenderName]}>
                  {item.senderName}
                </Text>
                <Text style={[styles.msgTime, isMe ? styles.myMsgTime : styles.peerMsgTime]}>
                  {item.timestamp} • {item.hopCount} Hop(s)
                </Text>
              </View>
              <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.peerMsgText]}>
                {item.text}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Input Box */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          placeholder={
            selectedRadio === 'wifi'
              ? 'Broadcast text over Wi-Fi Direct (250m)...'
              : 'Broadcast text over BLE mesh (50m)...'
          }
          placeholderTextColor="#64748b"
          value={inputMsg}
          onChangeText={setInputMsg}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            selectedRadio === 'wifi' ? { backgroundColor: '#059669' } : { backgroundColor: '#2563eb' }
          ]}
          onPress={handleSendMessage}
          activeOpacity={0.8}
        >
          {selectedRadio === 'wifi' ? (
            <Wifi size={17} color="#ffffff" />
          ) : (
            <Send size={18} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E8EBE2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#1C1F24',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  offlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F3EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E4D8',
  },
  offlineTagText: {
    color: '#5A6570',
    fontSize: 10,
    fontWeight: '700',
  },
  voiceCallBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3EE',
    borderColor: '#E0E4D8',
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    gap: 10,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  callText: {
    color: '#1C1F24',
    fontSize: 12,
    fontWeight: '700',
  },
  peerNameText: {
    color: '#1C1F24',
    fontWeight: '900',
  },
  voiceNoticeText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700',
    marginTop: 1,
  },
  pttBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pttBtnActive: {
    backgroundColor: '#dc2626',
  },
  pttBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  endCallBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: 6,
    borderRadius: 8,
  },
  peersSection: {
    marginBottom: 14,
  },
  emptyPeersBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8F9F5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E8EBE2',
  },
  emptyPeersText: {
    color: '#1C1F24',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyPeersSub: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  subTitle: {
    color: '#5A6570',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  peerCard: {
    flexDirection: 'column',
    backgroundColor: '#F8F9F5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E8EBE2',
    minWidth: 160,
  },
  peerCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#ECFDF5',
  },
  peerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  peerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8EBE2',
  },
  peerName: {
    color: '#1C1F24',
    fontSize: 12,
    fontWeight: '700',
  },
  peerDist: {
    color: '#707A84',
    fontSize: 10,
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
  peerActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  peerChatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  peerChatBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  peerCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingVertical: 5,
    borderRadius: 8,
  },
  peerCallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  chatFeed: {
    gap: 8,
    marginBottom: 12,
  },
  msgBubble: {
    borderRadius: 14,
    padding: 10,
    maxWidth: '90%',
  },
  myMsg: {
    backgroundColor: '#1E2124',
    alignSelf: 'flex-end',
  },
  peerMsg: {
    backgroundColor: '#F1F3EE',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E0E4D8',
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 12,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
  },
  mySenderName: {
    color: '#38bdf8',
  },
  peerSenderName: {
    color: '#0f172a',
  },
  msgTime: {
    fontSize: 9,
  },
  myMsgTime: {
    color: '#94a3b8',
  },
  peerMsgTime: {
    color: '#64748b',
  },
  msgText: {
    fontSize: 13,
  },
  myMsgText: {
    color: '#ffffff',
  },
  peerMsgText: {
    color: '#1e293b',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8F9F5',
    color: '#1C1F24',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#E8EBE2',
  },
  sendBtn: {
    backgroundColor: '#1E2124',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCallBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#450a0a',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    gap: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  groupCallIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCallTitle: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  groupCallSub: {
    color: '#fecaca',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  radioSelectorContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  radioTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EBE2',
  },
  radioTabActiveWifi: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  radioTabActiveBle: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  radioTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5A6570',
  },
  radioTabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
