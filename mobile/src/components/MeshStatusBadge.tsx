import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NetworkMode } from '../types';
import { Wifi, Radio, RefreshCw, Cpu } from 'lucide-react-native';

interface MeshStatusBadgeProps {
  mode: NetworkMode;
  peerCount: number;
  queuedCount: number;
  onSyncPress: () => void;
  syncing: boolean;
}

export const MeshStatusBadge: React.FC<MeshStatusBadgeProps> = ({
  mode,
  peerCount,
  queuedCount,
  onSyncPress,
  syncing,
}) => {
  const getModeDetails = () => {
    switch (mode) {
      case 'ONLINE':
        return {
          label: 'Cellular / Wi-Fi Online',
          badgeBg: '#064e3b',
          textColor: '#34d399',
          Icon: Wifi,
        };
      case 'BLE_MESH':
        return {
          label: `BLE Mesh Active (${peerCount} Peer Nodes)`,
          badgeBg: '#1e3a8a',
          textColor: '#60a5fa',
          Icon: Radio,
        };
      case 'OFFLINE_QUEUED':
      default:
        return {
          label: `Offline (${queuedCount} Queued)`,
          badgeBg: '#78350f',
          textColor: '#fbbf24',
          Icon: Cpu,
        };
    }
  };

  const currentMode = getModeDetails();
  const IconComponent = currentMode.Icon;

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: currentMode.badgeBg }]}>
        <IconComponent size={16} color={currentMode.textColor} />
        <Text style={[styles.badgeText, { color: currentMode.textColor }]}>{currentMode.label}</Text>
      </View>

      {queuedCount > 0 && (
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={onSyncPress}
          disabled={syncing}
          activeOpacity={0.7}
        >
          <RefreshCw size={14} color="#38bdf8" />
          <Text style={styles.syncText}>{syncing ? 'Syncing...' : 'Force Sync'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    borderColor: '#0284c7',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  syncText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
});
