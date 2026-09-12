import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Radio, Smartphone, Cpu, ShieldCheck } from 'lucide-react-native';
import { MeshPeer } from '../types';

interface MeshRelayFeedProps {
  peers?: MeshPeer[];
}

export const MeshRelayFeed: React.FC<MeshRelayFeedProps> = ({ peers }) => {
  const list = (peers || []).map((p) => ({
    id: p.id,
    name: p.name || `Node ${p.id.slice(0, 6)}`,
    signal: `${p.signalStrength || -65} dBm`,
    packets: p.relayedPacketsCount || 0,
    hops: `${p.distanceMeters ? Math.ceil(p.distanceMeters / 250) : 1} Hop(s)`,
  }));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Radio size={18} color="#38bdf8" />
          <Text style={styles.title}>ACTIVE BLUETOOTH MESH RELAYS</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{list.length} RELAYS CONNECTED</Text>
        </View>
      </View>

      <Text style={styles.desc}>
        Nearby phones automatically chain distress signals peer-to-peer when cellular infrastructure fails.
      </Text>

      <View style={styles.listContainer}>
        {list.length === 0 ? (
          <View style={{ paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>
              Scanning nearby BLE frequencies... Peer nodes appear here automatically when in proximity.
            </Text>
          </View>
        ) : (
          list.map((item) => (
            <View key={item.id} style={styles.relayRow}>
              <View style={styles.leftCol}>
                <View style={styles.iconCircle}>
                  <Smartphone size={16} color="#64748b" />
                </View>
                <View>
                  <Text style={styles.relayName}>{item.name}</Text>
                  <Text style={styles.relayMeta}>{item.hops} • {item.packets} Packets Forwarded</Text>
                </View>
              </View>

              <View style={styles.rightCol}>
                <Text style={styles.signalVal}>{item.signal}</Text>
                <Text style={styles.statusText}>Chain Active</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  badge: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '800',
  },
  desc: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 14,
    lineHeight: 16,
  },
  listContainer: {
    gap: 10,
  },
  relayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  relayName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  relayMeta: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  signalVal: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
  },
  statusText: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 2,
  },
});
