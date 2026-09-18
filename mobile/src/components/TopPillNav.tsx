import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { ShieldCheck, Wifi, Radio, AlertTriangle, ChevronDown, ChevronLeft, User, Menu } from 'lucide-react-native';

export type CitizenTab = 'status' | 'mesh' | 'map' | 'directives';

interface TopPillNavProps {
  activeTab?: CitizenTab;
  onTabChange?: (tab: CitizenTab) => void;
  networkMode: 'ONLINE' | 'BLE_MESH' | 'OFFLINE_QUEUED';
  topInset?: number;
  phoneModel?: string;
  onOpenSidebar?: () => void;
  userName?: string;
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
  activeTab = 'status',
  onTabChange,
  networkMode,
  topInset = 0,
  phoneModel,
  onOpenSidebar,
  userName,
}) => {
  const dotColor = MODE_COLOR[networkMode] || '#10b981';
  const modeLabel = MODE_LABEL[networkMode] || '4G Live';

  const ModeIcon =
    networkMode === 'ONLINE' ? Wifi : networkMode === 'BLE_MESH' ? Radio : AlertTriangle;

  const isHome = activeTab === 'status';

  const userInitial = userName && userName.trim().length > 0 ? userName.trim().charAt(0).toUpperCase() : 'C';

  // Dynamic header title & subtitle depending on active tab
  let screenTitle = 'NeerNetra';
  let screenSubtitle = userName && !userName.startsWith('Citizen [') ? `Profile: ${userName}` : (phoneModel ? `${phoneModel}: Bharthia, UP` : 'Sector: Bharthia, UP');

  if (activeTab === 'map') {
    screenTitle = 'Offline GIS Map';
    screenSubtitle = 'Yamuna Basin • Mathura Sector';
  } else if (activeTab === 'mesh') {
    screenTitle = 'Decentralized Mesh';
    screenSubtitle = 'Off-Grid Walkie & Peer Relay';
  } else if (activeTab === 'directives') {
    screenTitle = 'Directives & Alerts';
    screenSubtitle = 'NDRF & Civil Defense Orders';
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(topInset, 12) + 4 }]}>
      {/* Left Circle Icon Action Buttons */}
      <View style={styles.leftGroup}>
        {/* Profile / Menu Drawer Trigger */}
        <TouchableOpacity
          style={[styles.circleBtn, styles.profileBtn]}
          onPress={onOpenSidebar}
          activeOpacity={0.7}
        >
          <View style={styles.avatarMiniBadge}>
            <Text style={styles.avatarMiniText}>{userInitial}</Text>
          </View>
        </TouchableOpacity>

        {!isHome && (
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => onTabChange?.('status')}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color="#1C1F24" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => onTabChange?.(activeTab === 'mesh' ? 'status' : 'mesh')}
          activeOpacity={0.7}
        >
          <Radio size={18} color={activeTab === 'mesh' ? '#059669' : '#475569'} />
        </TouchableOpacity>
      </View>


      {/* Center Branding & Sector Location */}
      <View style={styles.centerBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.brandTitle}>{screenTitle}</Text>
          {isHome && <ShieldCheck size={15} color="#059669" style={styles.shieldIcon} />}
        </View>
        <TouchableOpacity
          style={styles.subtitleRow}
          onPress={() => !isHome && onTabChange?.('status')}
          activeOpacity={0.8}
        >
          <Text style={styles.brandSubtitle} numberOfLines={1}>
            {screenSubtitle}
          </Text>
          <ChevronDown size={13} color="#5A6570" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
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
  profileBtn: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  avatarMiniBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
});


