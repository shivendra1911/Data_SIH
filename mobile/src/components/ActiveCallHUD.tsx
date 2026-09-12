import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Mic, MicOff, PhoneOff, Radio, Volume2 } from 'lucide-react-native';
import { meshEngine } from '../services/bluetoothMesh';

interface ActiveCallHUDProps {
  peer: {
    id: string;
    name: string;
    distance?: number;
    hopCount?: number;
  };
  onEndCall: () => void;
}

export const ActiveCallHUD: React.FC<ActiveCallHUDProps> = ({ peer, onEndCall }) => {
  const [seconds, setSeconds] = useState(0);
  const [isTransmitting, setIsTransmitting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePushToTalkPressIn = () => {
    setIsTransmitting(true);
    // Transmit signaling burst over mesh
    meshEngine.sendVoiceBurst(peer.id, 'PTT_BURST_ACTIVE');
  };

  const handlePushToTalkPressOut = () => {
    setIsTransmitting(false);
    meshEngine.sendVoiceBurst(peer.id, 'PTT_BURST_RELEASED');
  };

  return (
    <View style={styles.hudContainer}>
      {/* Status Row */}
      <View style={styles.topRow}>
        <View style={styles.statusPill}>
          <View style={[styles.activeDot, isTransmitting && styles.activeDotTransmitting]} />
          <Text style={styles.statusPillText}>
            {isTransmitting ? 'TRANSMITTING ON MESH' : 'INTERCOM LIVE'}
          </Text>
        </View>

        <Text style={styles.timerText}>{formatTime(seconds)}</Text>
      </View>

      {/* Peer Info */}
      <View style={styles.peerRow}>
        <View style={styles.peerAvatar}>
          <Volume2 size={20} color="#10b981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.peerName}>{peer.name}</Text>
          <Text style={styles.peerMeta}>
            {peer.distance ? `${peer.distance}m away` : 'Nearby'} • Hop {peer.hopCount || 1} • BLE P2P
          </Text>
        </View>
      </View>

      {/* Push-to-Talk and End Call Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.pttBtn, isTransmitting && styles.pttBtnActive]}
          onPressIn={handlePushToTalkPressIn}
          onPressOut={handlePushToTalkPressOut}
          activeOpacity={0.8}
        >
          <Mic size={20} color="#ffffff" />
          <Text style={styles.pttText}>
            {isTransmitting ? 'HOLDING MIC (SPEAKING)' : 'HOLD TO TALK (PTT)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.hangupBtn}
          onPress={onEndCall}
          activeOpacity={0.8}
        >
          <PhoneOff size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hudContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  activeDotTransmitting: {
    backgroundColor: '#ef4444',
  },
  statusPillText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  peerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  peerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  peerName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  peerMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pttBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 14,
  },
  pttBtnActive: {
    backgroundColor: '#ef4444',
  },
  pttText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  hangupBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
