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
import { meshEngine } from '../services/bluetoothMesh';
import { Radio, Mic, MicOff, Send, WifiOff, Volume2, Shield, Phone, MessageSquare } from 'lucide-react-native';

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
  const [peers, setPeers] = useState<MeshPeer[]>(propPeers || meshEngine.getConnectedPeers());

  const displayPeers = peers;

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

  const handleSendMessage = async () => {
    if (!inputMsg.trim()) return;
    const text = inputMsg;
    setInputMsg('');
    try {
      // Sends via real BLE to all connected peers
      const newMsg = await meshEngine.sendChatMessage('You', text);
      setMessages([...meshEngine.getMeshChatMessages()]);
    } catch (e) {
      Alert.alert('Send Failed', 'Could not send message via BLE mesh. Are you connected to any peers?');
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
      meshEngine.initiateCall(peer.id, peer.name).catch(() => {});
      Alert.alert(
        '📡 Mesh Intercom Request Sent',
        `Calling ${peer.name} over Bluetooth P2P Direct Mesh.\n\nWaiting for peer to accept on their device screen.`
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Radio size={20} color="#60a5fa" />
          <Text style={styles.headerTitle}>OFFLINE BLE WALKIE-TALKIE & CHAT</Text>
        </View>
        <View style={styles.offlineTag}>
          <WifiOff size={12} color="#fbbf24" />
          <Text style={styles.offlineTagText}>No Cellular Needed</Text>
        </View>
      </View>

      {/* Active Walkie Talkie Voice Channel Bar */}
      {isCalling && (
        <View style={styles.voiceCallBar}>
          <View style={styles.pulseDot} />
          <Volume2 size={20} color="#34d399" />
          <Text style={styles.callText}>
            WALKIE-TALKIE LIVE: <Text style={styles.peerNameText}>{activePeerName}</Text>
          </Text>
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
        style={styles.groupCallBanner}
        onPress={() => {
          if (onGroupEmergencyCall) {
            onGroupEmergencyCall();
          } else {
            meshEngine.initiateGroupCall();
          }
        }}
        activeOpacity={0.85}
      >
        <View style={styles.groupCallIconCircle}>
          <Phone size={16} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.groupCallTitle}>🚨 GROUP EMERGENCY CALL (ALL NODES)</Text>
          <Text style={styles.groupCallSub}>Rings all nearby phones simultaneously for urgent disaster coordination</Text>
        </View>
      </TouchableOpacity>

      {/* Connected Bluetooth Peers List */}
      <View style={styles.peersSection}>
        <Text style={styles.subTitle}>Nearby Mesh Nodes ({displayPeers.length} Active):</Text>
        <FlatList
          data={displayPeers}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyPeersBox}>
              <Radio size={16} color="#60a5fa" />
              <View>
                <Text style={styles.emptyPeersText}>Scanning for nearby BLE peers...</Text>
                <Text style={styles.emptyPeersSub}>Keep Bluetooth ON on both devices</Text>
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
                  <View style={styles.peerIconCircle}>
                    <Mic size={14} color="#60a5fa" />
                  </View>
                  <View style={{ flex: 1, minWidth: 100 }}>
                    <Text style={styles.peerName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.peerDist}>{item.distanceMeters ?? '?'}m away • {item.signalStrength}dBm</Text>
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
                    style={styles.peerCallBtn}
                    onPress={() => {
                      if (onCallPeer) {
                        onCallPeer(item);
                      } else {
                        handleStartWalkieTalkie(item);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Phone size={11} color="#ffffff" />
                    <Text style={styles.peerCallBtnText}>Call</Text>
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
          placeholder="Broadcast text over BLE mesh chain..."
          placeholderTextColor="#64748b"
          value={inputMsg}
          onChangeText={setInputMsg}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage} activeOpacity={0.8}>
          <Send size={18} color="#ffffff" />
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
    flex: 1,
    color: '#1C1F24',
    fontSize: 12,
    fontWeight: '700',
  },
  peerNameText: {
    color: '#1C1F24',
    fontWeight: '900',
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
});
