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
import { Radio, Mic, MicOff, Send, WifiOff, Volume2, Shield } from 'lucide-react-native';

interface BluetoothWalkieTalkieProps {
  peers?: MeshPeer[];
}

export const BluetoothWalkieTalkie: React.FC<BluetoothWalkieTalkieProps> = ({ peers: propPeers }) => {
  const [messages, setMessages] = useState<MeshChatMessage[]>(meshEngine.getMeshChatMessages());
  const [inputMsg, setInputMsg] = useState<string>('');
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [activePeerName, setActivePeerName] = useState<string | null>(null);
  const [peers, setPeers] = useState<MeshPeer[]>(propPeers || meshEngine.getConnectedPeers());

  useEffect(() => {
    if (propPeers) {
      setPeers(propPeers);
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

  const handleStartWalkieTalkie = async (peer: MeshPeer) => {
    if (isCalling && activePeerName === peer.name) {
      await meshEngine.endCall(peer.id);
      setIsCalling(false);
      setActivePeerName(null);
    } else {
      setIsCalling(true);
      setActivePeerName(peer.name);
      await meshEngine.initiateCall(peer.id, peer.name);
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
            onPress={() => setIsCalling(false)}
            activeOpacity={0.7}
          >
            <MicOff size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Connected Bluetooth Peers List */}
      <View style={styles.peersSection}>
        <Text style={styles.subTitle}>Nearby Mesh Nodes ({peers.length} Active):</Text>
        {peers.length === 0 ? (
          <View style={{ paddingVertical: 10, paddingHorizontal: 4 }}>
            <Text style={{ color: '#707A84', fontSize: 12 }}>
              Scanning for emergency nodes... Keep Bluetooth ON on friends' devices.
            </Text>
          </View>
        ) : (
          <FlatList
            data={peers}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.peerCard,
                  isCalling && activePeerName === item.name && styles.peerCardActive,
                ]}
                onPress={() => handleStartWalkieTalkie(item)}
                activeOpacity={0.8}
              >
                <View style={styles.peerIconCircle}>
                  <Mic size={14} color="#60a5fa" />
                </View>
                <View>
                  <Text style={styles.peerName}>{item.name}</Text>
                  <Text style={styles.peerDist}>{item.distanceMeters ?? '?'}m away • {item.signalStrength}dBm</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Offline Mesh Messages Feed */}
      <View style={styles.chatFeed}>
        <Text style={styles.subTitle}>Mesh Broadcast Chat:</Text>
        {messages.map((item) => (
          <View
            key={item.id}
            style={[
              styles.msgBubble,
              item.senderId === 'user_me' ? styles.myMsg : styles.peerMsg,
            ]}
          >
            <View style={styles.msgHeader}>
              <Text style={styles.senderName}>{item.senderName}</Text>
              <Text style={styles.msgTime}>{item.timestamp} • {item.hopCount} Hop(s)</Text>
            </View>
            <Text style={styles.msgText}>{item.text}</Text>
          </View>
        ))}
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
  subTitle: {
    color: '#5A6570',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  peerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8F9F5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E8EBE2',
  },
  peerCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#ECFDF5',
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
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '700',
  },
  msgTime: {
    color: '#94a3b8',
    fontSize: 9,
  },
  msgText: {
    color: '#ffffff',
    fontSize: 13,
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
});
