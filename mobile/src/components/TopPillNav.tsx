import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { ShieldCheck, Wifi, Radio, AlertTriangle, ChevronDown } from 'lucide-react-native';

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
  const modeLabel = MODE_LABEL[networkMode] || '4G Live';

  const ModeIcon =
    networkMode === 'ONLINE' ? Wifi : networkMode === 'BLE_MESH' ? Radio : AlertTriangle;

  return (
    <View style={[styles.container, { paddingTop: Math.max(topInset, 12) + 4 }]}>
      {/* Left Circle Icon Action Buttons */}
      <View style={styles.leftGroup}>
        <View style={styles.circleBtn}>
          <Image
            source={require('../../assets/logo_emblem.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.circleBtn}>
          <Radio size={18} color="#475569" />
        </View>
      </View>

      {/* Center Branding & Sector Location */}
      <View style={styles.centerBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.brandTitle}>NeerNetra</Text>
          <ShieldCheck size={15} color="#059669" style={styles.shieldIcon} />
        </View>
        <View style={styles.subtitleRow}>
          <Text style={styles.brandSubtitle} numberOfLines={1}>
            {phoneModel ? `${phoneModel}: Bharthia, UP` : 'Sector: Bharthia, UP'}
          </Text>
          <ChevronDown size={13} color="#5A6570" style={{ marginLeft: 2 }} />
        </View>
      </View>

      {/* Right Circle Status Button */}
      <View style={styles.rightGroup}>
        <View style={styles.circleBtn}>
          <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
          <ModeIcon size={16} color={dotColor} />
        </View>
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
    paddingBottom: 12,
    backgroundColor: '#F8F9F5',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEFE6',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EAE0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  logoImage: {
    width: 26,
    height: 26,
  },
  centerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1F24',
    letterSpacing: -0.3,
  },
  shieldIcon: {
    marginLeft: 1,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5A6570',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

