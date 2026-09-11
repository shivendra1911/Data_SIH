import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { SOSType } from '../types';
import { AlertCircle, Activity, LifeBuoy, Utensils, ShieldAlert, X } from 'lucide-react-native';

interface SOSTypePickerProps {
  visible: boolean;
  selectedType: SOSType;
  onSelectType: (type: SOSType) => void;
  onClose: () => void;
}

export const SOSTypePicker: React.FC<SOSTypePickerProps> = ({
  visible,
  selectedType,
  onSelectType,
  onClose,
}) => {
  const options: { type: SOSType; label: string; desc: string; icon: any; color: string }[] = [
    {
      type: 'TRAPPED',
      label: 'Trapped / Structural Collapse',
      desc: 'Trapped under landslide debris or flooded building',
      icon: AlertCircle,
      color: '#ef4444',
    },
    {
      type: 'MEDICAL',
      label: 'Medical Emergency',
      desc: 'Injuries, severe hypothermia, or immediate medical need',
      icon: Activity,
      color: '#f97316',
    },
    {
      type: 'EVACUATION',
      label: 'Flood Evacuation Required',
      desc: 'Surrounded by rapidly rising flash flood water',
      icon: LifeBuoy,
      color: '#3b82f6',
    },
    {
      type: 'FOOD_WATER',
      label: 'Food & Clean Water',
      desc: 'Stranded without drinking water or essential rations',
      icon: Utensils,
      color: '#10b981',
    },
    {
      type: 'GENERAL',
      label: 'General Emergency',
      desc: 'Standard high-priority rescue request',
      icon: ShieldAlert,
      color: '#a855f7',
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Specify Emergency Type</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Helps NDRF & rescue helicopters prioritize high-vulnerability targets.
          </Text>

          {options.map((item) => {
            const IconComp = item.icon;
            const isSelected = selectedType === item.type;
            return (
              <TouchableOpacity
                key={item.type}
                style={[
                  styles.optionCard,
                  isSelected && { borderColor: item.color, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                ]}
                onPress={() => {
                  onSelectType(item.type);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: item.color + '22' }]}>
                  <IconComp size={22} color={item.color} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.optionLabel, isSelected && { color: item.color }]}>
                    {item.label}
                  </Text>
                  <Text style={styles.optionDesc}>{item.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  optionLabel: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '700',
  },
  optionDesc: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 2,
  },
});
