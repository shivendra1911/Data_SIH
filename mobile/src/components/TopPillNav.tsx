import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft, SlidersHorizontal, Share2, Plus } from 'lucide-react-native';

interface TopPillNavProps {
  activeTab: 'telemetry' | 'rescue' | 'map';
  onTabChange: (tab: 'telemetry' | 'rescue' | 'map') => void;
  onFilterPress?: () => void;
  onActionPress?: () => void;
}

export const TopPillNav: React.FC<TopPillNavProps> = ({
  activeTab,
  onTabChange,
  onFilterPress,
  onActionPress,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.iconCircle} activeOpacity={0.7}>
        <ArrowLeft size={18} color="#1e293b" />
      </TouchableOpacity>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.pillTab, activeTab === 'telemetry' && styles.pillTabActive]}
          onPress={() => onTabChange('telemetry')}
          activeOpacity={0.8}
        >
          <Text style={[styles.pillText, activeTab === 'telemetry' && styles.pillTextActive]}>
            Telemetry
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pillTab, activeTab === 'rescue' && styles.pillTabActive]}
          onPress={() => onTabChange('rescue')}
          activeOpacity={0.8}
        >
          <Text style={[styles.pillText, activeTab === 'rescue' && styles.pillTextActive]}>
            Rescue
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pillTab, activeTab === 'map' && styles.pillTabActive]}
          onPress={() => onTabChange('map')}
          activeOpacity={0.8}
        >
          <Text style={[styles.pillText, activeTab === 'map' && styles.pillTextActive]}>
            Live Map
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.iconCircle} onPress={onFilterPress} activeOpacity={0.7}>
        <SlidersHorizontal size={18} color="#1e293b" />
      </TouchableOpacity>
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
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  pillTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  pillTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
});
