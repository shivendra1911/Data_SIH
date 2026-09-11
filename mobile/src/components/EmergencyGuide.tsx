import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Mountain, Droplet, Radio, Flashlight } from 'lucide-react-native';

export const EmergencyGuide: React.FC = () => {
  const guides = [
    {
      icon: Mountain,
      color: '#f97316',
      title: 'Move to High Ground',
      desc: 'Climb at least 50m above valley riverbeds immediately. Never seek shelter under riverbank cliffs or bridges.',
    },
    {
      icon: Droplet,
      color: '#06b6d4',
      title: 'Clean Water Precaution',
      desc: 'Avoid drinking flood water. High glacial silt causes kidney stress. Use sealed bottled water or purification drops.',
    },
    {
      icon: Radio,
      color: '#3b82f6',
      title: 'Keep Bluetooth Active',
      desc: 'NeerNetra uses offline BLE mesh. Nearby phones act as repeaters to pass your SOS to the nearest rescue team.',
    },
    {
      icon: Flashlight,
      color: '#eab308',
      title: 'Helicopter Signaling',
      desc: 'At night, flash phone strobe light 3 times continuously towards search choppers for emergency thermal location.',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OFFLINE SURVIVAL PROTOCOL</Text>
      <Text style={styles.subtitle}>Essential actions during Glacial Lake Outburst / Flash Flood</Text>

      {guides.map((item, index) => {
        const IconComp = item.icon;
        return (
          <View key={index} style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: item.color + '1A' }]}>
              <IconComp size={22} color={item.color} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0b1329',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  title: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    marginBottom: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#162032',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '700',
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },
});
