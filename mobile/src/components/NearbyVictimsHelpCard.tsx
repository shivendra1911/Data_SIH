import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SOSStatus, SOSType } from '../types';
import { Phone, MessageSquare, AlertCircle, Activity, MapPin, HeartHandshake, ShieldCheck } from 'lucide-react-native';

export interface NearbyVictim {
  id: string;
  name: string;
  distanceMeters: number;
  status: SOSStatus;
  sosType: SOSType;
  locationName: string;
  batteryPercent: number;
  lastActiveTime: string;
  isUnresponsive?: boolean;
}

interface NearbyVictimsHelpCardProps {
  onCallVictim?: (victim: NearbyVictim) => void;
  onMessageVictim?: (victim: NearbyVictim) => void;
}

export const NearbyVictimsHelpCard: React.FC<NearbyVictimsHelpCardProps> = ({
  onCallVictim,
  onMessageVictim,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'SOS' | 'SAFE'>('ALL');

  const victims: NearbyVictim[] = [
    {
      id: 'vic_1',
      name: 'Ramesh Kumar',
      distanceMeters: 120,
      status: 'SOS',
      sosType: 'TRAPPED',
      locationName: 'Chamoli Bridge Slope',
      batteryPercent: 42,
      lastActiveTime: '2 mins ago',
      isUnresponsive: true, // Unresponsive after 5 min countdown!
    },
    {
      id: 'vic_2',
      name: 'Sunita Devi & Family',
      distanceMeters: 340,
      status: 'SOS',
      sosType: 'MEDICAL',
      locationName: 'Joshimath Ridge Road',
      batteryPercent: 78,
      lastActiveTime: 'Just now',
      isUnresponsive: false,
    },
    {
      id: 'vic_3',
      name: 'Vikram Singh',
      distanceMeters: 510,
      status: 'HELPING',
      sosType: 'EVACUATION',
      locationName: 'Sector 1 Hilltop Shelter',
      batteryPercent: 91,
      lastActiveTime: '4 mins ago',
      isUnresponsive: false,
    },
  ];

  const filteredList = victims.filter((v) => {
    if (filter === 'SOS') return v.status === 'SOS';
    if (filter === 'SAFE') return v.status === 'SAFE' || v.status === 'HELPING';
    return true;
  });

  const getStatusColor = (v: NearbyVictim) => {
    if (v.isUnresponsive || v.status === 'SOS') return '#ef4444';
    if (v.status === 'HELPING') return '#3b82f6';
    return '#10b981';
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <AlertCircle size={20} color="#ef4444" />
          <Text style={styles.title}>NEARBY PEOPLE NEEDING HELP</Text>
        </View>

        <View style={styles.filterPillGroup}>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'ALL' && styles.filterPillActive]}
            onPress={() => setFilter('ALL')}
          >
            <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'SOS' && styles.filterPillActiveRed]}
            onPress={() => setFilter('SOS')}
          >
            <Text style={[styles.filterText, filter === 'SOS' && styles.filterTextActive]}>🚨 SOS</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Connect directly with nearby citizens & volunteer responders via offline Bluetooth mesh call or text.
      </Text>

      {/* List of Nearby Citizens */}
      <View style={styles.listContainer}>
        {filteredList.map((item) => {
          const isDanger = item.isUnresponsive || item.status === 'SOS';

          return (
            <View
              key={item.id}
              style={[
                styles.itemCard,
                isDanger ? styles.dangerCard : styles.standardCard,
              ]}
            >
              <View style={styles.itemTop}>
                <View style={styles.nameBlock}>
                  <View style={styles.nameRow}>
                    <Text style={styles.victimName}>{item.name}</Text>
                    {item.isUnresponsive && (
                      <View style={styles.unresponsiveBadge}>
                        <Text style={styles.unresponsiveText}>5-MIN UNRESPONSIVE</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.metaRow}>
                    <MapPin size={12} color="#64748b" />
                    <Text style={styles.metaText}>
                      {item.locationName} • <Text style={styles.distBold}>{item.distanceMeters}m away</Text>
                    </Text>
                  </View>
                </View>

                <View style={[styles.needTag, { backgroundColor: getStatusColor(item) + '20', borderColor: getStatusColor(item) }]}>
                  <Text style={[styles.needText, { color: getStatusColor(item) }]}>
                    {item.sosType || item.status}
                  </Text>
                </View>
              </View>

              {/* Action Buttons for Citizens to help each other */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.callMeshBtn}
                  onPress={() => {
                    if (onCallVictim) onCallVictim(item);
                    else Alert.alert('Offline Mesh Call', `Calling ${item.name} over Bluetooth Walkie-Talkie Mesh...`);
                  }}
                  activeOpacity={0.8}
                >
                  <Phone size={14} color="#ffffff" />
                  <Text style={styles.btnText}>Call over Mesh</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.chatMeshBtn}
                  onPress={() => {
                    if (onMessageVictim) onMessageVictim(item);
                    else Alert.alert('Offline Chat', `Opening BLE Mesh text chat with ${item.name}...`);
                  }}
                  activeOpacity={0.8}
                >
                  <MessageSquare size={14} color="#0f172a" />
                  <Text style={styles.chatBtnText}>Send Message</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
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
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  filterPillGroup: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 2,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterPillActive: {
    backgroundColor: '#ffffff',
  },
  filterPillActiveRed: {
    backgroundColor: '#ef4444',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 14,
    lineHeight: 16,
  },
  listContainer: {
    gap: 10,
  },
  itemCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
  },
  standardCard: {
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
    marginBottom: 10,
  },
  nameBlock: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  victimName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  unresponsiveBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unresponsiveText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748b',
  },
  distBold: {
    color: '#0f172a',
    fontWeight: '700',
  },
  needTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  needText: {
    fontSize: 10,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  callMeshBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 8,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  chatMeshBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 8,
  },
  chatBtnText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
  },
});
