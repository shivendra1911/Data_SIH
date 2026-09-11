import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Compass, Navigation, Mountain, HeartPulse, Phone, ShieldCheck } from 'lucide-react-native';
import { EvacuationShelter, LanguageMode } from '../types';
import { t } from '../services/i18n';

interface SafeShelterCompassCardProps {
  shelter: EvacuationShelter | null;
  language?: LanguageMode;
}

export const SafeShelterCompassCard: React.FC<SafeShelterCompassCardProps> = ({
  shelter,
  language = 'en',
}) => {
  if (!shelter) return null;

  const displayName = language === 'hi' && shelter.name_hi ? shelter.name_hi : shelter.name;
  const distText =
    shelter.distance_m && shelter.distance_m < 1000
      ? `${shelter.distance_m} m`
      : `${shelter.distance_km || 1.8} km`;

  const elevationText =
    shelter.elevation_gain_m != null
      ? shelter.elevation_gain_m >= 0
        ? `+${shelter.elevation_gain_m}m`
        : `${shelter.elevation_gain_m}m`
      : '+150m';

  const handleCall = () => {
    if (shelter.contact_phone) {
      Linking.openURL(`tel:${shelter.contact_phone}`).catch(() => {});
    }
  };

  return (
    <View style={styles.card}>
      {/* Top Header Badge */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconCircle}>
            <Mountain size={16} color="#0284c7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerBadgeText}>{t('safeHighGround', language)}</Text>
            <Text style={styles.shelterName} numberOfLines={2}>
              {displayName}
            </Text>
          </View>
        </View>

        <View style={styles.openBadge}>
          <View style={styles.greenDot} />
          <Text style={styles.openText}>SAFE HAVEN</Text>
        </View>
      </View>

      {/* Metrics Row: Distance, Elevation Delta, Compass Direction */}
      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>{t('distance', language)}</Text>
          <View style={styles.metricValRow}>
            <Navigation size={14} color="#0284c7" />
            <Text style={styles.metricValue}>{distText}</Text>
          </View>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>{t('elevationGain', language)}</Text>
          <View style={styles.metricValRow}>
            <Mountain size={14} color="#059669" />
            <Text style={[styles.metricValue, { color: '#059669' }]}>{elevationText}</Text>
          </View>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>{t('bearing', language)}</Text>
          <View style={styles.metricValRow}>
            <Compass size={14} color="#d97706" />
            <Text style={[styles.metricValue, { color: '#d97706' }]}>
              {shelter.bearing_compass || 'NE'} {shelter.bearing_deg != null ? `${shelter.bearing_deg}°` : '45°'}
            </Text>
          </View>
        </View>
      </View>

      {/* Amenities Badges */}
      <View style={styles.amenitiesRow}>
        {shelter.medical_support && (
          <View style={styles.amenityPill}>
            <HeartPulse size={12} color="#dc2626" />
            <Text style={styles.amenityText}>{t('medicalAvailable', language)}</Text>
          </View>
        )}
        {shelter.food_water_stocked && (
          <View style={styles.amenityPill}>
            <ShieldCheck size={12} color="#059669" />
            <Text style={styles.amenityText}>{t('foodStocked', language)}</Text>
          </View>
        )}
      </View>

      {/* Bottom Emergency Call & Protocol Footer */}
      {shelter.contact_phone && (
        <TouchableOpacity style={styles.callButton} onPress={handleCall} activeOpacity={0.8}>
          <Phone size={14} color="#ffffff" />
          <Text style={styles.callButtonText}>
            {t('callReliefCenter', language)} ({shelter.contact_phone})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shelterName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
    lineHeight: 18,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  openText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065f46',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284c7',
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  amenityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  amenityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  callButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
