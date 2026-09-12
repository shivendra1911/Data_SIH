import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CitizenBeaconItem } from '../types';
import { User, Check, AlertCircle, ShieldCheck, Activity } from 'lucide-react-native';

interface PeopleBeaconCardProps {
  beacons: CitizenBeaconItem[];
  onSelectBeacon?: (id: string) => void;
}

export const PeopleBeaconCard: React.FC<PeopleBeaconCardProps> = ({
  beacons,
  onSelectBeacon,
}) => {
  const defaultBeacons: CitizenBeaconItem[] = [
    {
      id: '1',
      name: 'Harry Bender',
      role: 'NDRF Disaster Lead',
      status: 'HELPING',
      location: 'Chamoli Sector 1',
      countryFlag: '🇮🇳 India',
      distance: '0.4 km',
      timestamp: 'Mar 13, 2026',
      selected: false,
    },
    {
      id: '2',
      name: 'Katy Fuller',
      role: 'Citizen Responder',
      status: 'SOS',
      sosType: 'TRAPPED',
      location: 'Joshimath Ridge',
      countryFlag: '🇮🇳 India',
      distance: '1.2 km',
      timestamp: 'Oct 13, 2026',
      selected: true, // Golden yellow highlight matching Katy Fuller card in mockup!
    },
    {
      id: '3',
      name: 'Jonathan Kelly',
      role: 'Mobile Edge Node',
      status: 'SAFE',
      location: 'Badrinath Base',
      countryFlag: '🇮🇳 India',
      distance: '2.8 km',
      timestamp: 'Mar 13, 2026',
      selected: false,
    },
  ];

  const list = beacons && beacons.length > 0 ? beacons : defaultBeacons;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>People</Text>

      {/* Top Stat Pills matching mockup top header bar */}
      <View style={styles.statsRow}>
        <View style={[styles.statPill, styles.statDark]}>
          <Text style={styles.statDarkText}>25%</Text>
        </View>
        <View style={[styles.statPill, styles.statYellow]}>
          <Text style={styles.statYellowText}>51%</Text>
        </View>
        <View style={[styles.statPill, styles.statStriped]}>
          <Text style={styles.statStripedText}>10%</Text>
        </View>
        <View style={[styles.statPill, styles.statStriped]}>
          <Text style={styles.statStripedText}>14%</Text>
        </View>
      </View>

      {/* List of People / Citizen Triage Cards */}
      <View style={styles.listContainer}>
        {list.map((item) => {
          const isHighlight = item.selected;

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.personCard,
                isHighlight ? styles.highlightCard : styles.standardCard,
              ]}
              onPress={() => onSelectBeacon && onSelectBeacon(item.id)}
              activeOpacity={0.85}
            >
              {/* Top Row: Avatar, Name, Role, Status Pill */}
              <View style={styles.cardHeader}>
                <View style={styles.avatarRow}>
                  <View
                    style={[
                      styles.avatarBox,
                      isHighlight ? styles.avatarHighlight : styles.avatarStandard,
                    ]}
                  >
                    <User size={20} color={isHighlight ? '#78350f' : '#475569'} />
                  </View>
                  <View>
                    <Text style={[styles.nameText, isHighlight && styles.textDark]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.roleText, isHighlight && styles.textDarkSub]}>
                      {item.role}
                    </Text>
                  </View>
                </View>

                {/* Status Tag Pill matching mockup */}
                <View
                  style={[
                    styles.statusPill,
                    isHighlight ? styles.statusPillHighlight : styles.statusPillStandard,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          item.status === 'SOS'
                            ? '#dc2626'
                            : item.status === 'HELPING'
                            ? '#2563eb'
                            : '#16a34a',
                      },
                    ]}
                  />
                  <Text style={[styles.statusText, isHighlight && styles.textDark]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              {/* Middle Row: Department, Country, Salary/Distance Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailCol}>
                  <Text style={[styles.detailLabel, isHighlight && styles.textDarkSub]}>
                    Sector
                  </Text>
                  <Text style={[styles.detailValue, isHighlight && styles.textDark]}>
                    {item.location}
                  </Text>
                </View>

                <View style={styles.detailCol}>
                  <Text style={[styles.detailLabel, isHighlight && styles.textDarkSub]}>
                    Country
                  </Text>
                  <Text style={[styles.detailValue, isHighlight && styles.textDark]}>
                    {item.countryFlag}
                  </Text>
                </View>

                <View style={styles.detailCol}>
                  <Text style={[styles.detailLabel, isHighlight && styles.textDarkSub]}>
                    Distance
                  </Text>
                  <Text style={[styles.detailValue, isHighlight && styles.textDark]}>
                    {item.distance}
                  </Text>
                </View>
              </View>

              {/* Bottom Row: Timestamp and Checkbox */}
              <View style={styles.cardFooter}>
                <Text style={[styles.timestampText, isHighlight && styles.textDarkSub]}>
                  Start date <Text style={styles.boldTime}>{item.timestamp}</Text>
                </Text>

                <View
                  style={[
                    styles.checkbox,
                    isHighlight ? styles.checkboxChecked : styles.checkboxUnchecked,
                  ]}
                >
                  {isHighlight && <Check size={14} color="#ffffff" />}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    letterSpacing: -0.8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statPill: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDark: {
    backgroundColor: '#1e293b',
  },
  statDarkText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  statYellow: {
    backgroundColor: '#fbbf24',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  statYellowText: {
    color: '#78350f',
    fontSize: 12,
    fontWeight: '800',
  },
  statStriped: {
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  statStripedText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    gap: 12,
  },
  personCard: {
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  standardCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  highlightCard: {
    backgroundColor: '#fcd34d', // Vibrant warm golden yellow matching reference image!
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarStandard: {
    backgroundColor: '#f1f5f9',
  },
  avatarHighlight: {
    backgroundColor: '#fef3c7',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  roleText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillStandard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusPillHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
    paddingVertical: 8,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  timestampText: {
    fontSize: 11,
    color: '#64748b',
  },
  boldTime: {
    fontWeight: '700',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnchecked: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#0f172a',
  },
  textDark: {
    color: '#1e1b4b',
  },
  textDarkSub: {
    color: '#78350f',
  },
});
