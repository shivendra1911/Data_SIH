import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { ShieldAlert, ShieldCheck, Siren, Phone, HeartHandshake } from 'lucide-react-native';
import { SOSType } from '../types';

interface SOSBigButtonProps {
  onSOSTrigger: (type: SOSType) => void;
  onConfirmSafe: () => void;
  onConfirmHelping?: () => void;
  currentStatus: 'SOS' | 'SAFE' | 'HELPING' | null;
  disabled?: boolean;
}


const SOS_TYPES: { type: SOSType; label: string; color: string }[] = [
  { type: 'TRAPPED', label: 'TRAPPED', color: '#dc2626' },
  { type: 'MEDICAL', label: 'MEDICAL', color: '#7c3aed' },
  { type: 'EVACUATION', label: 'EVACUATION', color: '#d97706' },
  { type: 'FOOD_WATER', label: 'FOOD/WATER', color: '#0891b2' },
];

export const SOSBigButton: React.FC<SOSBigButtonProps> = ({
  onSOSTrigger,
  onConfirmSafe,
  onConfirmHelping,
  currentStatus,
  disabled = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the SOS button
  useEffect(() => {
    if (currentStatus === 'SOS') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [currentStatus]);

  const handleSOSPress = () => {
    if (disabled) return;
    if (currentStatus === 'SOS') {
      Alert.alert('SOS Active', 'Your SOS beacon is already broadcasting. Stay safe!');
      return;
    }
    setExpanded((e) => !e);
  };

  const handleTypeSelect = (type: SOSType) => {
    setExpanded(false);
    onSOSTrigger(type);
  };

  return (
    <View style={styles.wrapper}>
      {/* SOS Type Picker (expanded) */}
      {expanded && (
        <View style={styles.typeGrid}>
          {SOS_TYPES.map((t) => (
            <TouchableOpacity
              key={t.type}
              style={[styles.typeBtn, { borderColor: t.color }]}
              onPress={() => handleTypeSelect(t.type)}
              activeOpacity={0.8}
            >
              <Text style={[styles.typeLabel, { color: t.color }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.triageActionRow}>
        {/* I AM SAFE button */}
        <TouchableOpacity
          style={[
            styles.safeBtn,
            currentStatus === 'SAFE' && styles.safeBtnActive,
          ]}
          onPress={onConfirmSafe}
          activeOpacity={0.8}
        >
          <ShieldCheck size={18} color={currentStatus === 'SAFE' ? '#ffffff' : '#059669'} />
          <Text
            style={[
              styles.safeBtnText,
              currentStatus === 'SAFE' && { color: '#ffffff' },
            ]}
          >
            I AM SAFE
          </Text>
        </TouchableOpacity>

        {/* I AM HELPING button */}
        <TouchableOpacity
          style={[
            styles.helpingBtn,
            currentStatus === 'HELPING' && styles.helpingBtnActive,
          ]}
          onPress={onConfirmHelping}
          activeOpacity={0.8}
        >
          <HeartHandshake size={18} color={currentStatus === 'HELPING' ? '#ffffff' : '#0284c7'} />
          <Text
            style={[
              styles.helpingBtnText,
              currentStatus === 'HELPING' && { color: '#ffffff' },
            ]}
          >
            I AM HELPING
          </Text>
        </TouchableOpacity>
      </View>

      {/* Primary Big SOS Button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[
            styles.sosBtn,
            currentStatus === 'SOS' && styles.sosBtnActive,
          ]}
          onPress={handleSOSPress}
          activeOpacity={0.85}
        >
          <ShieldAlert size={22} color="#ffffff" />
          <Text style={styles.sosBtnText}>
            {currentStatus === 'SOS' ? '🚨 SOS BEACON ACTIVE' : '🚨 SEND EMERGENCY SOS'}
          </Text>
        </TouchableOpacity>
      </Animated.View>


      {currentStatus === 'SOS' && (
        <View style={styles.activeBeaconBar}>
          <View style={styles.pulseDot} />
          <Text style={styles.beaconText}>
            SOS BEACON LIVE — Broadcasting to NDRF & all nearby mesh nodes
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  triageActionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  safeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderRadius: 14,
    paddingVertical: 12,
  },
  safeBtnActive: {
    backgroundColor: '#059669',
  },
  safeBtnText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '900',
  },
  helpingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    borderWidth: 1.5,
    borderColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 12,
  },
  helpingBtnActive: {
    backgroundColor: '#0284c7',
  },
  helpingBtnText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: '900',
  },

  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    elevation: 4,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  sosBtnActive: {
    backgroundColor: '#7f1d1d',
    borderColor: '#ef4444',
  },
  sosBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  activeBeaconBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#450a0a',
    borderColor: '#dc2626',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  beaconText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
});
