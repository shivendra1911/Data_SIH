import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceModelName } from './api';

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  bloodGroup: string;
  emergencyContact: string;
  medicalNotes?: string;
  updatedAt?: string;
}

const USER_PROFILE_KEY = '@neernetra_user_profile_v1';

let cachedProfile: UserProfile | null = null;
const listeners: Array<(profile: UserProfile) => void> = [];

export const getUserProfile = async (): Promise<UserProfile> => {
  if (cachedProfile) return cachedProfile;
  try {
    const raw = await AsyncStorage.getItem(USER_PROFILE_KEY);
    if (raw) {
      cachedProfile = JSON.parse(raw);
      return cachedProfile!;
    }
  } catch (e) {
    console.warn('[userProfileService] Failed to load user profile:', e);
  }

  // Sensible default before user customizes
  const defaultModel = getDeviceModelName() || 'Citizen';
  const defaultProfile: UserProfile = {
    name: `Citizen ${defaultModel}`,
    email: '',
    phone: '',
    bloodGroup: 'O+',
    emergencyContact: '',
    medicalNotes: '',
    updatedAt: new Date().toISOString(),
  };
  cachedProfile = defaultProfile;
  return defaultProfile;
};

export const saveUserProfile = async (profile: Partial<UserProfile>): Promise<UserProfile> => {
  try {
    const existing = await getUserProfile();
    const updated: UserProfile = {
      ...existing,
      ...profile,
      name: (profile.name || existing.name || 'Citizen').trim(),
      email: (profile.email !== undefined ? profile.email : existing.email).trim(),
      phone: (profile.phone !== undefined ? profile.phone : existing.phone).trim(),
      bloodGroup: profile.bloodGroup || existing.bloodGroup || 'O+',
      emergencyContact: (profile.emergencyContact !== undefined ? profile.emergencyContact : existing.emergencyContact).trim(),
      medicalNotes: (profile.medicalNotes !== undefined ? profile.medicalNotes : existing.medicalNotes || '').trim(),
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updated));
    cachedProfile = updated;

    // Notify listeners
    listeners.forEach((listener) => {
      try {
        listener(updated);
      } catch (err) {
        console.warn('[userProfileService] Listener error:', err);
      }
    });

    return updated;
  } catch (e) {
    console.error('[userProfileService] Failed to save profile:', e);
    throw e;
  }
};

export const onUserProfileChanged = (listener: (profile: UserProfile) => void): (() => void) => {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

export const getUserDisplayName = (): string => {
  if (cachedProfile && cachedProfile.name && cachedProfile.name.trim().length > 0) {
    return cachedProfile.name.trim();
  }
  return 'Citizen';
};
