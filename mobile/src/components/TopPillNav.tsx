import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Activity, Radio, Map, Droplets } from 'lucide-react-native';

export type CitizenTab = 'status' | 'mesh' | 'map';

interface TopPillNavProps {
  activeTab: CitizenTab;
  onTabChange: (tab: CitizenTab) => void;
  networkMode: 'ONLINE' | 'BLE_MESH' | 'OFFLINE_QUEUED';
}

const TABS: { id: CitizenTab; label: string; Icon: React.ComponentType<any> }[] = [
  { id: 'status', label: 'Status', Icon: Activity },
  { id: 'mesh', label: 'Mesh', Icon: Radio },
  { id: 'map', label: 'Map', Icon: Map },
];

const MODE_COLOR: Record<string, string> = {
  ONLINE: '#10b981',
  BLE_MESH: '#f59e0b',
  OFFLINE_QUEUED: '#ef4444',
};

const MODE_LABEL: Record<string, string> = {
  ONLINE: '4G Live',
  BLE_MESH: 'BLE Mesh',
  OFFLINE_QUEUED: 'Offline',
};

export const TopPillNav: React.FC<TopPillNavProps> = ({
  activeTab,
  onTabChange,
  networkMode,
}) => {
  const dotColor = MODE_COLOR[networkMode] || '#10b981';
  const modeLabel = MODE_LABEL[networkMode] || 'Online';

  return (
    <View style={styles.container}>
      {/* App Logo + Network Status */}
      <View style={styles.logoBlock}>
        <Droplets size={18} color="#2563eb" />
        <Text style={styles.logoText}>NeerNetra</Text>
        <View style={[styles.netDot, { backgroundColor: dotColor }]} />
        <Text style={[styles.netLabel, { color: dotColor }]}>{modeLabel}</Text>
      </View>

      {/* Tab Pills */}
      <View style={styles.tabContainer}>
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.pillTab, isActive && styles.pillTabActive]}
              onPress={() => onTabChange(id)}
              activeOpacity={0.8}
            >
              <Icon size={14} color={isActive ? '#0f172a' : '#64748b'} />
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  logoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  logoText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  netDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: 4,
  },
  netLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  pillTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pillTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  pillTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
});
