import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { AlertCircle, Phone, MessageSquare, MapPin, Battery, Clock } from 'lucide-react-native';
import { MeshPeer, SOSStatus } from '../types';
import { meshEngine } from '../services/bluetoothMesh';

interface NearbyVictimsHelpCardProps {
  onCallVictim?: (peer: MeshPeer) => void;
  onMessageVictim?: (peer: MeshPeer) => void;
}

const statusColor = (status?: SOSStatus) => {
  if (status === 'SOS') return '#ef4444';
  if (status === 'HELPING') return '#3b82f6';
  return '#10b981';
};

const statusLabel = (peer: MeshPeer) => {
  if (!peer.status || peer.status === 'SAFE') return 'SAFE';
  if (peer.status === 'SOS') return 'SOS';
  return 'HELPING';
};

export const NearbyVictimsHelpCard: React.FC<NearbyVictimsHelpCardProps> = ({
  onCallVictim,
  onMessageVictim,
}) => {
  const [peers, setPeers] = useState<MeshPeer[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'SOS'>('ALL');

  useEffect(() => {
    // Initial load
    setPeers(meshEngine.getConnectedPeers());

    // Refresh every 10 seconds to pick up new peers
    const interval = setInterval(() => {
      setPeers(meshEngine.getConnectedPeers());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const filtered = peers.filter((p) => {
    if (filter === 'SOS') return p.status === 'SOS';
    return true;
  });

  const sosCriticalCount = peers.filter((p) => p.status === 'SOS').length;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <AlertCircle size={18} color="#ef4444" />
          <View>
            <Text style={styles.title}>NEARBY PEOPLE IN RANGE</Text>
            <Text style={styles.subtitle}>
              {peers.length} Bluetooth mesh peers detected
            </Text>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterGroup}>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'ALL' && styles.filterActive]}
            onPress={() => setFilter('ALL')}
          >
            <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'SOS' && styles.filterActiveRed]}
            onPress={() => setFilter('SOS')}
          >
            <Text style={[styles.filterText, filter === 'SOS' && styles.filterTextWhite]}>
              {sosCriticalCount > 0 ? `🚨 SOS (${sosCriticalCount})` : 'SOS'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.desc}>
        Contact nearby citizens directly over offline Bluetooth mesh — no internet needed.
      </Text>

      {/* Peer List */}
      <View style={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {filter === 'SOS'
                ? 'No SOS signals detected nearby.'
                : 'Scanning for nearby Bluetooth mesh peers...'}
            </Text>
          </View>
        ) : (
          filtered.map((peer) => {
            const isDanger = peer.status === 'SOS';
            const color = statusColor(peer.status);
            return (
              <View
                key={peer.id}
                style={[styles.itemCard, isDanger ? styles.dangerCard : styles.normalCard]}
              >
                {/* Top row: name + status badge */}
                <View style={styles.itemTop}>
                  <View style={styles.nameCol}>
                    <Text style={styles.peerName}>{peer.name}</Text>
                    <View style={styles.metaRow}>
                      <MapPin size={11} color="#64748b" />
                      <Text style={styles.metaText}>
                        {peer.distanceMeters ? `${peer.distanceMeters}m away` : peer.location || 'Near you'}
                        {'  •  '}
                        {peer.signalStrength} dBm
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: color + '22', borderColor: color }]}>
                    <Text style={[styles.statusText, { color }]}>{statusLabel(peer)}</Text>
                  </View>
                </View>

                {/* Role */}
                {peer.role && (
                  <Text style={styles.roleText}>{peer.role}</Text>
                )}

                {/* Action buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => {
                      if (onCallVictim) onCallVictim(peer);
                      else
                        Alert.alert(
                          'BLE Walkie-Talkie',
                          `Connecting to ${peer.name} over P2P Bluetooth intercom...`
                        );
                    }}
                    activeOpacity={0.8}
                  >
                    <Phone size={13} color="#ffffff" />
                    <Text style={styles.callBtnText}>Call over Mesh</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.msgBtn}
                    onPress={() => {
                      if (onMessageVictim) onMessageVictim(peer);
                      else
                        Alert.alert(
                          'Mesh Chat',
                          `Opening BLE offline text chat with ${peer.name}...`
                        );
                    }}
                    activeOpacity={0.8}
                  >
                    <MessageSquare size={13} color="#0f172a" />
                    <Text style={styles.msgBtnText}>Send Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 1,
  },
  filterGroup: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 2,
    gap: 2,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterActive: {
    backgroundColor: '#ffffff',
  },
  filterActiveRed: {
    backgroundColor: '#ef4444',
  },
  filterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#0f172a',
  },
  filterTextWhite: {
    color: '#ffffff',
  },
  desc: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 14,
    lineHeight: 16,
  },
  list: {
    gap: 10,
  },
  emptyState: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
  itemCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
  },
  normalCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  dangerCard: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nameCol: {
    flex: 1,
  },
  peerName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 10,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  roleText: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 8,
  },
  callBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  msgBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 8,
  },
  msgBtnText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '800',
  },
});
