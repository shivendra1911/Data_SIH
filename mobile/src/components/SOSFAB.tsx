import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Text,
  TouchableWithoutFeedback,
} from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { SOSBigButton } from './SOSBigButton';
import { SOSType } from '../types';

interface SOSFABProps {
  onSOSTrigger: (type: SOSType) => void;
  onConfirmSafe: () => void;
  currentStatus: 'SOS' | 'SAFE' | 'HELPING' | null;
}

export const SOSFAB: React.FC<SOSFABProps> = ({
  onSOSTrigger,
  onConfirmSafe,
  currentStatus,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation when SOS is active
  useEffect(() => {
    if (currentStatus === 'SOS') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [currentStatus]);

  const handleTrigger = (type: SOSType) => {
    setModalVisible(false);
    onSOSTrigger(type);
  };

  const handleSafe = () => {
    setModalVisible(false);
    onConfirmSafe();
  };

  return (
    <>
      {/* 
        FIX: bottom is now 70 (above the 60px tab bar) so SOS button
        does NOT overlap the Map/Mesh/Status tab bar buttons.
        The tab bar is 60px tall, so we position 70px from bottom.
      */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={[styles.fab, currentStatus === 'SOS' && styles.fabActive]}
          activeOpacity={0.8}
          onPress={() => setModalVisible(true)}
        >
          <ShieldAlert color="#fff" size={28} />
          <Text style={styles.fabLabel}>SOS</Text>
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Emergency Controls</Text>
                </View>
                <SOSBigButton
                  onSOSTrigger={handleTrigger}
                  onConfirmSafe={handleSafe}
                  currentStatus={currentStatus}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    // FIXED: 70px from bottom so it sits ABOVE the 60px tab bar
    bottom: 70,
    alignSelf: 'center',
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fca5a5',
    gap: 2,
  },
  fabLabel: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  fabActive: {
    backgroundColor: '#7f1d1d',
    borderColor: '#ef4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
});
