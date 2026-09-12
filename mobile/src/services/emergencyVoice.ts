import * as Speech from 'expo-speech';
import { Vibration } from 'react-native';

export const triggerEmergencyVoiceAudio = async () => {
  try {
    // Note: expo-av was removed due to native JSI TurboModule crashes on boot.
    // Audio will play through Android's default TTS engine volume stream.
    
    // 1. SOS Morse Code Vibration (3 short, 3 long, 3 short)
    const PATTERN = [
      0, 200, 100, 200, 100, 200, // S
      500, 600, 100, 600, 100, 600, // O
      500, 200, 100, 200, 100, 200, // S
    ];
    Vibration.vibrate(PATTERN, true);

    // 2. Play a very loud Text-To-Speech siren/voice
    Speech.speak('EMERGENCY! RED ALERT! EVACUATE TO THE NEAREST SAFE ZONE IMMEDIATELY!', {
      language: 'en-IN',
      pitch: 1.2,
      rate: 0.9,
      onDone: () => {
        // Repeat the warning
        Speech.speak('THIS IS AN EMERGENCY. SEEK HIGHER GROUND NOW.', {
          language: 'en-IN',
          pitch: 1.2,
          rate: 0.9,
        });
      }
    });

  } catch (error) {
    console.warn('[EmergencyVoice] Failed to trigger audio:', error);
  }
};

export const stopEmergencyVoiceAudio = () => {
  Vibration.cancel();
  Speech.stop();
};
