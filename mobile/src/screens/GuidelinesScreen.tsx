import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {
  ShieldAlert,
  Landmark,
  Newspaper,
  PhoneCall,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import { OfficialNotification, fetchOfficialGuidelines } from '../services/api';

import { getLastKnownLocation } from '../services/locationTracker';

export const GuidelinesScreen: React.FC = () => {
  const [guidelines, setGuidelines] = useState<OfficialNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'NATIONAL_CALAMITY' | 'LOCAL_GOVT' | 'LOCAL_NEWS'>('ALL');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');

  const loadData = useCallback(async () => {
    try {
      const loc = await getLastKnownLocation();
      const data = await fetchOfficialGuidelines(loc?.lat, loc?.lng);
      setGuidelines(data);
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      setLastRefreshed(`${hours}:${mins} IST`);
    } catch (err) {
      console.warn('[GuidelinesScreen] Failed to load guidelines:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const dialNumber = (phone?: string) => {
    if (!phone) return;
    const cleaned = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() => {});
  };

  const filteredGuidelines = guidelines.filter((item) => {
    if (activeTab === 'ALL') return true;
    return item.source_type === activeTab;
  });

  const getSeverityBadgeStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return { bg: '#fee2e2', text: '#dc2626', border: '#f87171' };
      case 'WARNING':
        return { bg: '#ffedd5', text: '#ea580c', border: '#fb923c' };
      case 'ADVISORY':
        return { bg: '#e0f2fe', text: '#0284c7', border: '#38bdf8' };
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'NATIONAL_CALAMITY':
        return <ShieldAlert size={14} color="#dc2626" />;
      case 'LOCAL_GOVT':
        return <Landmark size={14} color="#0284c7" />;
      case 'LOCAL_NEWS':
        return <Newspaper size={14} color="#8b5cf6" />;
      default:
        return <AlertTriangle size={14} color="#f59e0b" />;
    }
  };

  const countByTab = {
    ALL: guidelines.length,
    NATIONAL_CALAMITY: guidelines.filter((g) => g.source_type === 'NATIONAL_CALAMITY').length,
    LOCAL_GOVT: guidelines.filter((g) => g.source_type === 'LOCAL_GOVT').length,
    LOCAL_NEWS: guidelines.filter((g) => g.source_type === 'LOCAL_NEWS').length,
  };

  return (
    <View style={styles.container}>
      {/* ─── Top Official Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.govtEmblemContainer}>
            <Landmark size={20} color="#0284c7" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={styles.verifiedRow}>
              <Text style={styles.headerTitle}>GOVERNMENT DIRECTIVES</Text>
              <View style={styles.verifiedBadge}>
                <CheckCircle2 size={12} color="#10b981" />
                <Text style={styles.verifiedBadgeText}>OFFICIAL</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              National Calamity Control & Local News Bulletins
            </Text>
          </View>
        </View>

        {/* Status Pill & Live indicator */}
        <View style={styles.statusMetaRow}>
          <View style={styles.liveIndicator}>
            <View style={[styles.liveDot, { backgroundColor: guidelines.length > 0 ? '#ef4444' : '#10b981' }]} />
            <Text style={[styles.liveText, { color: guidelines.length > 0 ? '#f87171' : '#10b981' }]}>
              {guidelines.length > 0 ? 'ACTIVE HAZARD BULLETINS' : 'SECTOR TELEMETRY ALL CLEAR'}
            </Text>
          </View>
          <Text style={styles.updatedText}>Updated: {lastRefreshed}</Text>
        </View>

        {/* ─── Emergency Helplines (Only shown when danger bulletins are active) ─── */}
        {guidelines.length > 0 && (
          <View style={styles.helplineRow}>
            <TouchableOpacity
              style={[styles.helplinePill, { backgroundColor: '#fee2e2' }]}
              onPress={() => dialNumber('1070')}
              activeOpacity={0.8}
            >
              <PhoneCall size={12} color="#dc2626" style={{ marginRight: 4 }} />
              <Text style={[styles.helplineText, { color: '#dc2626' }]}>1070 State Disaster</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.helplinePill, { backgroundColor: '#ffedd5' }]}
              onPress={() => dialNumber('1078')}
              activeOpacity={0.8}
            >
              <PhoneCall size={12} color="#ea580c" style={{ marginRight: 4 }} />
              <Text style={[styles.helplineText, { color: '#ea580c' }]}>1078 NDMA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.helplinePill, { backgroundColor: '#e0f2fe' }]}
              onPress={() => dialNumber('112')}
              activeOpacity={0.8}
            >
              <PhoneCall size={12} color="#0284c7" style={{ marginRight: 4 }} />
              <Text style={[styles.helplineText, { color: '#0284c7' }]}>112 Emergency</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ─── Category Filter Tabs ─── */}
      <View style={styles.tabBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'ALL' && styles.tabButtonActive]}
            onPress={() => setActiveTab('ALL')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>
              All ({countByTab.ALL})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'NATIONAL_CALAMITY' && styles.tabButtonActive]}
            onPress={() => setActiveTab('NATIONAL_CALAMITY')}
            activeOpacity={0.8}
          >
            <ShieldAlert size={13} color={activeTab === 'NATIONAL_CALAMITY' ? '#fff' : '#dc2626'} style={{ marginRight: 4 }} />
            <Text style={[styles.tabText, activeTab === 'NATIONAL_CALAMITY' && styles.tabTextActive]}>
              National Calamity ({countByTab.NATIONAL_CALAMITY})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'LOCAL_GOVT' && styles.tabButtonActive]}
            onPress={() => setActiveTab('LOCAL_GOVT')}
            activeOpacity={0.8}
          >
            <Landmark size={13} color={activeTab === 'LOCAL_GOVT' ? '#fff' : '#0284c7'} style={{ marginRight: 4 }} />
            <Text style={[styles.tabText, activeTab === 'LOCAL_GOVT' && styles.tabTextActive]}>
              District / State ({countByTab.LOCAL_GOVT})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'LOCAL_NEWS' && styles.tabButtonActive]}
            onPress={() => setActiveTab('LOCAL_NEWS')}
            activeOpacity={0.8}
          >
            <Newspaper size={13} color={activeTab === 'LOCAL_NEWS' ? '#fff' : '#8b5cf6'} style={{ marginRight: 4 }} />
            <Text style={[styles.tabText, activeTab === 'LOCAL_NEWS' && styles.tabTextActive]}>
              Local News ({countByTab.LOCAL_NEWS})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ─── Notification Feed List ─── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Fetching Government Directives & News...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.feedScroll}
          contentContainerStyle={styles.feedContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0284c7']}
              tintColor="#0284c7"
            />
          }
        >
          {filteredGuidelines.length === 0 ? (
            <View style={styles.emptyContainer}>
              <CheckCircle2 size={36} color="#10b981" />
              <Text style={styles.emptyTitle}>No Active Bulletins in this Category</Text>
              <Text style={styles.emptySubtitle}>All clear for this filter.</Text>
            </View>
          ) : (
            filteredGuidelines.map((item) => {
              const isExpanded = !!expandedIds[item.id];
              const sev = getSeverityBadgeStyle(item.severity);

              return (
                <View key={item.id} style={styles.card}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.sourceRow}>
                      <View style={styles.sourceIconBox}>
                        {getSourceIcon(item.source_type)}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sourceName} numberOfLines={1}>
                          {item.source || (item as any).organization || 'NDRF / SDMA Disaster Management'}
                        </Text>
                        <Text style={styles.refCodeText}>
                          {item.ref_code || 'OFFICIAL-BULLETIN'} • {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.severityBadge,
                        { backgroundColor: sev.bg, borderColor: sev.border },
                      ]}
                    >
                      <Text style={[styles.severityText, { color: sev.text }]}>
                        {item.severity || 'WARNING'}
                      </Text>
                    </View>
                  </View>

                  {/* Card Title */}
                  <Text style={styles.itemTitle}>{item.title || 'CIVIL EMERGENCY DIRECTIVE'}</Text>

                  {/* Card Summary */}
                  <Text style={styles.itemSummary}>{item.summary || (item as any).body || 'Ascend immediately to designated high ground refuge.'}</Text>

                  {/* Action Directive Highlight */}
                  {item.action_advice && (
                    <View style={styles.actionBox}>
                      <AlertTriangle size={14} color="#b45309" style={{ marginRight: 6 }} />
                      <Text style={styles.actionText}>
                        <Text style={{ fontWeight: '800' }}>Directive: </Text>
                        {item.action_advice}
                      </Text>
                    </View>
                  )}

                  {/* Expanded Full Order Text */}
                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      <View style={styles.divider} />
                      <Text style={styles.officialOrderHeader}>OFFICIAL ORDER / WIRE COPY</Text>
                      <Text style={styles.fullText}>{item.full_text || (item as any).body || item.summary || 'Emergency civil defense operational directive.'}</Text>
                    </View>
                  )}

                  {/* Card Bottom Actions */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.expandToggleBtn}
                      onPress={() => toggleExpand(item.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.expandToggleText}>
                        {isExpanded ? 'Show Less' : 'Read Full Order'}
                      </Text>
                      {isExpanded ? (
                        <ChevronUp size={14} color="#0284c7" />
                      ) : (
                        <ChevronDown size={14} color="#0284c7" />
                      )}
                    </TouchableOpacity>

                    {item.contact_hotline && (
                      <TouchableOpacity
                        style={styles.cardCallBtn}
                        onPress={() => dialNumber(item.contact_hotline)}
                        activeOpacity={0.8}
                      >
                        <PhoneCall size={13} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.cardCallText}>Call {item.contact_hotline}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}

          {/* Bottom Space */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1329',
  },
  header: {
    backgroundColor: '#111c35',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  govtEmblemContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  verifiedBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 3,
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  statusMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  liveText: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  updatedText: {
    color: '#64748b',
    fontSize: 10,
  },
  helplineRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  helplinePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  helplineText: {
    fontSize: 11,
    fontWeight: '800',
  },
  tabBarContainer: {
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tabScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tabButtonActive: {
    backgroundColor: '#0284c7',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  feedScroll: {
    flex: 1,
  },
  feedContent: {
    padding: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#131e36',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sourceRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  sourceIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sourceName: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '800',
  },
  refCodeText: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '900',
  },
  itemTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 6,
  },
  itemSummary: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  actionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#451a03',
    borderRadius: 8,
    padding: 9,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#78350f',
  },
  actionText: {
    flex: 1,
    color: '#fde68a',
    fontSize: 11,
    lineHeight: 16,
  },
  expandedSection: {
    marginTop: 4,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginBottom: 8,
  },
  officialOrderHeader: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  fullText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  expandToggleText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
  },
  cardCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cardCallText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 80,
  },
});
