import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Landmark, ShieldAlert, Newspaper } from 'lucide-react-native';
import { fetchOfficialGuidelines, OfficialNotification } from '../services/api';
import { getLastKnownLocation } from '../services/locationTracker';

export const GuidelineBar: React.FC = () => {
  const [headlines, setHeadlines] = useState<{ source: string; text: string; isCritical: boolean }[]>([]);
  const [index, setIndex] = useState(0);
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    const loadHeadlines = async () => {
      try {
        const loc = await getLastKnownLocation();
        const items = await fetchOfficialGuidelines(loc?.lat, loc?.lng);
        if (items && items.length > 0) {
          setHeadlines(
            items.map((g: OfficialNotification) => ({
              source: g.source_type === 'NATIONAL_CALAMITY' ? 'NDMA/CWC' : g.source_type === 'LOCAL_GOVT' ? 'DISTRICT CONTROL' : 'LOCAL NEWS',
              text: `${g.title}: ${g.summary}`,
              isCritical: g.severity === 'CRITICAL',
            }))
          );
          return;
        }
      } catch {}
      setHeadlines([]);
    };
    loadHeadlines();
  }, []);

  useEffect(() => {
    if (headlines.length <= 1) return;
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIndex((prev) => (prev + 1) % headlines.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [headlines.length]);

  const current = headlines[index] || {
    source: 'TELEMETRY',
    text: 'All Clear: Environmental sensors and river discharge normal in your sector.',
    isCritical: false,
  };

  return (
    <View style={[styles.container, current.isCritical && styles.containerCritical]}>
      <View style={styles.badge}>
        <Text style={[styles.badgeText, current.isCritical && styles.badgeTextCritical]}>
          {current.source}
        </Text>
      </View>
      <Animated.Text style={[styles.text, current.isCritical && styles.textCritical, { opacity: fadeAnim }]} numberOfLines={1}>
        {current.text}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#bae6fd',
  },
  containerCritical: {
    backgroundColor: '#fee2e2',
    borderBottomColor: '#fca5a5',
  },
  badge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeTextCritical: {
    backgroundColor: '#dc2626',
  },
  text: {
    flex: 1,
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '700',
  },
  textCritical: {
    color: '#b91c1c',
  },
});

