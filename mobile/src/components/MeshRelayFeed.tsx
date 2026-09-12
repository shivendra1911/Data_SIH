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
          <Radio size={18} color="#1C1F24" />
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
            <Text style={{ color: '#707A84', fontSize: 12, textAlign: 'center' }}>
              Scanning nearby BLE frequencies... Peer nodes appear here automatically when in proximity.
            </Text>
          </View>
        ) : (
          list.map((item) => (
            <View key={item.id} style={styles.relayRow}>
              <View style={styles.leftCol}>
                <View style={styles.iconCircle}>
                  <Smartphone size={16} color="#5A6570" />
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
    color: '#1C1F24',
    letterSpacing: 0.6,
  },
  badge: {
    backgroundColor: '#F1F3EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E4D8',
  },
  badgeText: {
    color: '#1C1F24',
    fontSize: 10,
    fontWeight: '800',
  },
  desc: {
    fontSize: 11,
    color: '#5A6570',
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
    backgroundColor: '#F8F9F5',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8EBE2',
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8EBE2',
  },
  relayName: {
    color: '#1C1F24',
    fontSize: 13,
    fontWeight: '700',
  },
  relayMeta: {
    color: '#707A84',
    fontSize: 10,
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  signalVal: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  statusText: {
    color: '#5A6570',
    fontSize: 9,
    marginTop: 2,
  },
});
