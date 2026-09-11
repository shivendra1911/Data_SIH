import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MeshPeer } from '../types';
import { Radio, Laptop, Smartphone, Shield, Activity } from 'lucide-react-native';

interface DarkSessionDrawerProps {
  peers?: MeshPeer[];
}

export const DarkSessionDrawer: React.FC<DarkSessionDrawerProps> = ({ peers }) => {
  const defaultItems = [
    {
      id: '1',
      name: 'Harry Bender',
      time: 'Sep 20, 17:30',
      location: 'Paris',
      flag: '🇫🇷',
      deviceType: 'phone',
    },
    {
      id: '2',
      name: 'Katy Fuller',
      time: 'Sep 20, 15:00',
      location: 'New York',
      flag: '🇺🇸',
      deviceType: 'phone',
    },
    {
      id: '3',
      name: 'Jonathan Kelly',
      time: 'Sep 20, 12:30',
      location: 'Victoria',
      flag: '🇨🇦',
      deviceType: 'laptop',
    },
    {
      id: '4',
      name: 'Billie Wright',
      time: 'Sep 20, 11:00',
      location: 'Paris',
      flag: '🇫🇷',
      deviceType: 'phone',
    },
    {
      id: '5',
      name: 'Sarah Page',
      time: 'Sep 19, 16:45',
      location: 'Perth',
      flag: '🇦🇺',
      deviceType: 'phone',
    },
    {
      id: '6',
      name: 'Erica Wyatt',
      time: 'Sep 19, 14:30',
      location: 'Paris',
      flag: '🇫🇷',
      deviceType: 'phone',
    },
  ];

  const list = peers && peers.length > 0 ? peers : defaultItems;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Session History</Text>
        <Text style={styles.counter}>2/8</Text>
      </View>

      <View style={styles.listContainer}>
        {list.map((item: any) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.leftCol}>
              {/* Device Icon + Avatar placeholder matching mockup */}
              <View style={styles.iconCircle}>
                {item.deviceType === 'laptop' ? (
                  <Laptop size={14} color="#94a3b8" />
                ) : (
                  <Smartphone size={14} color="#94a3b8" />
                )}
              </View>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{item.name.charAt(0)}</Text>
              </View>
              <View style={styles.nameBlock}>
                <Text style={styles.nameText}>{item.name}</Text>
                <Text style={styles.timeText}>{item.time || item.timestamp || 'Just now'}</Text>
              </View>
            </View>

            <View style={styles.rightCol}>
              <Text style={styles.flagIcon}>{item.flag || '🇮🇳'}</Text>
              <Text style={styles.locationText}>{item.location || 'Chamoli'}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a', // Sleek pitch black container matching mockup Right Screen!
    borderRadius: 28,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  counter: {
    fontSize: 22,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: -0.5,
  },
  listContainer: {
    gap: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  avatarInitial: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  nameBlock: {
    marginLeft: 2,
  },
  nameText: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  timeText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 1,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  flagIcon: {
    fontSize: 14,
  },
  locationText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
});
