import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { ShieldCheck, Wifi, Radio, AlertTriangle } from 'lucide-react-native';

export type CitizenTab = 'status' | 'mesh' | 'map' | 'directives';

interface TopPillNavProps {
  activeTab?: CitizenTab;
  onTabChange?: (tab: CitizenTab) => void;
  networkMode: 'ONLINE' | 'BLE_MESH' | 'OFFLINE_QUEUED';
  topInset?: number;
  phoneModel?: string;
}

const MODE_COLOR: Record<string, string> = {
  ONLINE: '#10b981',
  BLE_MESH: '#3b82f6',
  OFFLINE_QUEUED: '#f59e0b',
};

const MODE_BG: Record<string, string> = {
  ONLINE: 'rgba(16, 185, 129, 0.12)',
  BLE_MESH: 'rgba(59, 130, 246, 0.12)',
  OFFLINE_QUEUED: 'rgba(245, 158, 11, 0.12)',
};

const MODE_LABEL: Record<string, string> = {
  ONLINE: '4G Live',
  BLE_MESH: 'BLE Mesh',
  OFFLINE_QUEUED: 'Offline Queue',
};

export const TopPillNav: React.FC<TopPillNavProps> = ({
  networkMode,
  topInset = 0,
  phoneModel,
}) => {
  const dotColor = MODE_COLOR[networkMode] || '#10b981';
  const modeBg = MODE_BG[networkMode] || 'rgba(16, 185, 129, 0.12)';
  const modeLabel = MODE_LABEL[networkMode] || '4G Live';

  const ModeIcon =
    networkMode === 'ONLINE' ? Wifi : networkMode === 'BLE_MESH' ? Radio : AlertTriangle;

  return (
    <View style={[styles.container, { paddingTop: Math.max(topInset, 12) + 6 }]}>
      {/* Brand & Citizen Sector */}
      <View style={styles.brandBlock}>
        <View style={styles.logoIcon}>
          <Image
            source={require('../../assets/logo_emblem.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.brandTitle}>NeerNetra</Text>
            <ShieldCheck size={14} color="#059669" style={styles.shieldIcon} />
          </View>
          <Text style={styles.brandSubtitle} numberOfLines={1}>
            {phoneModel ? `${phoneModel} • Civil Defense` : 'Disaster Management & Rescue'}
          </Text>
        </View>
      </View>

      {/* Network Connectivity Pill */}
      <View style={[styles.statusPill, { backgroundColor: modeBg, borderColor: dotColor + '40' }]}>
        <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
        <ModeIcon size={12} color={dotColor} style={styles.statusIcon} />
        <Text style={[styles.statusText, { color: dotColor }]}>{modeLabel}</Text>
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
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    overflow: 'hidden',
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  shieldIcon: {
    marginLeft: 2,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusIcon: {
    marginRight: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
