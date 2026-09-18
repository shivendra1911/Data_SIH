import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from 'react-native';
import { Mic, PhoneOff, Volume2, Radio, Play, CheckCircle2, RotateCcw } from 'lucide-react-native';
import { meshEngine } from '../services/bluetoothMesh';
import { startVoiceRecording, stopVoiceRecording, playVoiceAudio, playPttTone } from '../services/gattServerBridge';

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
  const isGroupCall = peer.id === 'GROUP_CALL' || peer.name.includes('GROUP');
  const [seconds, setSeconds] = useState(0);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isPeerSpeaking, setIsPeerSpeaking] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [lastAudio, setLastAudio] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    const prevVoiceHandler = meshEngine.onVoiceBurstReceived;
    meshEngine.onVoiceBurstReceived = (senderId, audio) => {
      setIsPeerSpeaking(true);
      setLastAudio(audio);
      Vibration.vibrate(40);
      setStatusNotice('🔊 Live audio received from peer!');
      setTimeout(() => {
        setIsPeerSpeaking(false);
        setStatusNotice(null);
      }, 3500);
      if (prevVoiceHandler) prevVoiceHandler(senderId, audio);
    };

    return () => {
      clearInterval(timer);
      meshEngine.onVoiceBurstReceived = prevVoiceHandler;
    };
  }, []);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePushToTalkPressIn = async () => {
    try {
      playPttTone('start').catch(() => {});
      Vibration.vibrate(40);
      setIsTransmitting(true);
      setStatusNotice('🎙️ Recording voice from microphone...');
      await startVoiceRecording();
    } catch (e) {
      console.warn('[ActiveCallHUD] Mic start error:', e);
    }
  };

  const handlePushToTalkPressOut = async () => {
    try {
      setIsTransmitting(false);
      Vibration.vibrate(30);
      const base64Audio = await stopVoiceRecording();
      if (base64Audio && base64Audio.length > 0) {
        console.log(`[ActiveCallHUD] Transmitting ${base64Audio.length} chars of compressed voice to ${isGroupCall ? 'ALL NODES' : peer.name}`);
        setLastAudio(base64Audio);
        setStatusNotice(`📡 Dispatched ${(base64Audio.length * 0.75 / 1024).toFixed(1)} KB over BLE Mesh!`);
        await meshEngine.sendVoiceBurst(peer.id, base64Audio, isGroupCall);

        setTimeout(() => {
          setStatusNotice(`✅ Voice transmitted to ${isGroupCall ? 'all emergency nodes' : peer.name}`);
          setTimeout(() => setStatusNotice(null), 2500);
        }, 1200);
      } else {
        setStatusNotice('⚠️ Hold button longer to record voice (min 1 sec)');
        setTimeout(() => setStatusNotice(null), 3000);
      }
    } catch (e) {
      console.warn('[ActiveCallHUD] Mic stop error:', e);
    }
  };

  const handlePlayLastAudio = async () => {
    if (!lastAudio || isPlayingAudio) return;
    try {
      setIsPlayingAudio(true);
      setIsPeerSpeaking(true);
      setStatusNotice('🔊 Replaying last voice transmission...');
      await playVoiceAudio(lastAudio);
      setTimeout(() => {
        setIsPlayingAudio(false);
        setIsPeerSpeaking(false);
        setStatusNotice(null);
      }, 2500);
    } catch (err) {
      setIsPlayingAudio(false);
      setIsPeerSpeaking(false);
    }
  };

  return (
    <View style={[styles.hudContainer, isGroupCall && styles.hudContainerGroup]}>
      {/* Status Row */}
      <View style={styles.topRow}>
        <View style={[styles.statusPill, isGroupCall && styles.statusPillGroup]}>
          <View
            style={[
              styles.activeDot,
              isGroupCall && { backgroundColor: '#ef4444' },
              isTransmitting && styles.activeDotTransmitting,
              isPeerSpeaking && styles.activeDotReceiving,
            ]}
          />
          <Text style={[styles.statusPillText, isGroupCall && styles.statusPillTextGroup]}>
            {isTransmitting
              ? (isGroupCall ? '🚨 BROADCASTING TO ALL...' : '🎙️ TRANSMITTING VOICE...')
              : isPeerSpeaking
              ? '🔊 RECEIVING VOICE (SPEAKER)'
              : isGroupCall
              ? '🚨 GROUP EMERGENCY INTERCOM'
              : 'OFFLINE 1-TO-1 INTERCOM'}
          </Text>
        </View>

        <Text style={styles.timerText}>{formatTime(seconds)}</Text>
      </View>

      {/* Status Banner */}
      {statusNotice && (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>{statusNotice}</Text>
        </View>
      )}

      {/* Peer Info */}
      <View style={styles.peerRow}>
        <View style={[styles.peerAvatar, isGroupCall ? { backgroundColor: '#dc2626' } : (isPeerSpeaking && { backgroundColor: '#3b82f6' })]}>
          {isGroupCall ? <Radio size={20} color="#ffffff" /> : <Volume2 size={20} color="#ffffff" />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.peerName, isGroupCall && { color: '#fca5a5' }]}>{peer.name}</Text>
          <Text style={styles.peerMeta}>
            {isGroupCall
              ? 'Broadcast Mode • Rings & speaks to all nearby nodes simultaneously'
              : `${peer.distance ? `${peer.distance}m away` : 'Nearby'} • Hop ${peer.hopCount || 1} • Private 1-to-1 Channel`}
          </Text>
        </View>
      </View>

      {/* Push-to-Talk and End Call Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.pttBtn, isGroupCall && { backgroundColor: '#dc2626' }, isTransmitting && styles.pttBtnActive]}
          onPressIn={handlePushToTalkPressIn}
          onPressOut={handlePushToTalkPressOut}
          activeOpacity={0.8}
        >
          <Mic size={20} color="#ffffff" />
          <Text style={styles.pttText}>
            {isTransmitting
              ? 'SPEAKING... RELEASE TO SEND'
              : (isGroupCall ? 'HOLD TO TALK TO ALL NODES' : 'HOLD TO TALK (PTT)')}
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

      {/* Audio Echo / Replay Bar */}
      <View style={styles.audioOptionRow}>
        <View style={[styles.echoToggle, styles.echoToggleActive]}>
          <Volume2 size={12} color="#10b981" />
          <Text style={[styles.echoToggleText, { color: '#10b981' }]}>
            Loudspeaker: Active
          </Text>
        </View>

        {isGroupCall && (
          <View style={[styles.echoToggle, { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Radio size={12} color="#ef4444" />
            <Text style={[styles.echoToggleText, { color: '#ef4444', fontWeight: '700' }]}>
              All Nodes Alert
            </Text>
          </View>
        )}

        {lastAudio && (
          <TouchableOpacity
            style={styles.replayBtn}
            onPress={handlePlayLastAudio}
            activeOpacity={0.8}
            disabled={isPlayingAudio}
          >
            <RotateCcw size={12} color="#38bdf8" />
            <Text style={styles.replayBtnText}>
              {isPlayingAudio ? 'Playing...' : 'Play Last Voice'}
            </Text>
          </TouchableOpacity>
        )}
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
  hudContainerGroup: {
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
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
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusPillGroup: {
    backgroundColor: '#450a0a',
  },
  statusPillTextGroup: {
    color: '#fca5a5',
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
  activeDotReceiving: {
    backgroundColor: '#3b82f6',
  },
  statusPillText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerText: {
    color: '#94a3b8',
    fontSize: 13,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  peerName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  peerMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pttBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  pttBtnActive: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  pttText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  hangupBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10b981',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  noticeText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  audioOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  echoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  echoToggleActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  echoToggleText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  replayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  replayBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
});
