import React, { useEffect, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadows } from '@theme/colors';
import { useTodayStore } from '@store/todayStore';
import { usePillStore } from '@store/pillStore';
import { DateTime } from 'luxon';
import type { EventStatus } from '@types';

export const TodayScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isCompact = width < 480;
  const isMobile = width < 768;
  const { events, loadTodayEvents } = useTodayStore();
  const { pills, loadPills } = usePillStore();

  useEffect(() => {
    loadPills();
    loadTodayEvents();
  }, [loadPills, loadTodayEvents]);

  const stats = useMemo(() => {
    const total = events.length;
    const taken = events.filter((e) => e.status === 'TAKEN').length;
    const issues = events.filter((e) =>
      e.status === 'MISSED' ||
      e.status === 'FAILED' ||
      e.status === 'EMPTY_SILO' ||
      e.status === 'CUP_ABSENT'
    ).length;
    const upcoming = events.filter((e) => e.status === 'PENDING').length;

    return {
      adherence: total ? Math.round((taken / total) * 100) : 0,
      issues,
      upcoming,
    };
  }, [events]);

  const timeline = useMemo(() => {
    return [...events]
      .sort((a, b) => a.dueAtISO.localeCompare(b.dueAtISO))
      .map((event) => {
        const label = event.scheduleId
          ? `Schedule ${event.scheduleId}`
          : 'Dose';
        return {
          id: event.id,
          time: DateTime.fromISO(event.dueAtISO).toFormat('h:mm a'),
          label,
          status: event.status,
        };
      });
  }, [events]);

  const getTimelineStatusLabel = (status: EventStatus) => {
    switch (status) {
      case 'TAKEN':
        return 'Done';
      case 'SKIPPED':
        return 'Skipped';
      case 'MISSED':
        return 'Missed';
      case 'FAILED':
        return 'Failed';
      case 'EMPTY_SILO':
        return 'Empty silo';
      case 'CUP_ABSENT':
        return 'Cup absent';
      default:
        return 'Pending';
    }
  };

  const getTimelineStatusStyle = (status: EventStatus) => {
    switch (status) {
      case 'TAKEN':
        return styles.statusGood;
      case 'SKIPPED':
        return styles.statusNeutral;
      case 'MISSED':
        return styles.statusDanger;
      case 'FAILED':
        return styles.statusWarning;
      case 'EMPTY_SILO':
        return styles.statusDanger;
      case 'CUP_ABSENT':
        return styles.statusWarning;
      default:
        return styles.statusPending;
    }
  };

  const getTimelineDotStyle = (status: EventStatus) => {
    switch (status) {
      case 'TAKEN':
        return styles.timelineDotGood;
      case 'SKIPPED':
        return styles.timelineDotNeutral;
      case 'MISSED':
        return styles.timelineDotDanger;
      case 'FAILED':
        return styles.timelineDotWarning;
      case 'EMPTY_SILO':
        return styles.timelineDotDanger;
      case 'CUP_ABSENT':
        return styles.timelineDotWarning;
      default:
        return styles.timelineDotPending;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}>
        <View style={[styles.card, styles.hero, isMobile && styles.heroMobile]}>
          <Text style={[styles.heroTitle, isCompact && styles.heroTitleCompact]}>Daily Overview</Text>
          <Text style={styles.heroSubtitle}>
            {DateTime.now().toFormat('cccc, LLL dd')}
          </Text>
          <View style={[styles.metricsRow, isCompact && styles.metricsRowCompact]}>
            <View style={[styles.metric, isCompact && styles.metricCompact]}>
              <Text style={styles.metricLabel}>Adherence</Text>
              <Text style={[styles.metricValue, isCompact && styles.metricValueCompact]}>{stats.adherence}%</Text>
            </View>
            <View style={[styles.metric, isCompact && styles.metricCompact]}>
              <Text style={styles.metricLabel}>Upcoming</Text>
              <Text style={[styles.metricValue, isCompact && styles.metricValueCompact]}>{stats.upcoming}</Text>
            </View>
            <View style={[styles.metric, isCompact && styles.metricCompact]}>
              <Text style={styles.metricLabel}>Issues</Text>
              <Text style={[styles.metricValue, isCompact && styles.metricValueCompact, stats.issues ? styles.metricDanger : null]}>
                {stats.issues}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.timelineCard, isMobile && styles.timelineCardMobile]}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          {timeline.length === 0 ? (
            <Text style={styles.placeholder}>No doses scheduled today.</Text>
          ) : (
            timeline.map((item) => (
              <View key={item.id} style={[styles.timelineRow, isCompact && styles.timelineRowCompact]}>
                <View
                  style={[
                    styles.timelineDot,
                    isCompact && styles.timelineDotCompact,
                    getTimelineDotStyle(item.status),
                  ]}
                />
                <View style={styles.timelineInfo}>
                  <Text style={[styles.timelineTime, isCompact && styles.timelineTimeCompact]}>{item.time}</Text>
                  <Text style={[styles.timelineLabel, isCompact && styles.timelineLabelCompact]}>{item.label}</Text>
                </View>
                <Text
                  style={[
                    styles.statusBadge,
                    isCompact && styles.statusBadgeCompact,
                    getTimelineStatusStyle(item.status),
                  ]}
                >
                  {getTimelineStatusLabel(item.status)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingVertical: 24, gap: 20 },
  contentMobile: { paddingHorizontal: 16, paddingVertical: 16, gap: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    ...shadows.card,
  },
  hero: { gap: 16 },
  heroMobile: { padding: 20, borderRadius: 20 },
  heroTitle: { color: colors.textPrimary, fontSize: 26, fontWeight: '700' },
  heroTitleCompact: { fontSize: 22 },
  heroSubtitle: { color: colors.textSecondary },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metricsRowCompact: { gap: 8 },
  metric: { flex: 1, gap: 6 },
  metricCompact: { gap: 4 },
  metricLabel: { color: colors.textSecondary, fontSize: 13 },
  metricValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  metricValueCompact: { fontSize: 18 },
  metricDanger: { color: colors.danger },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
  timelineCard: { gap: 12 },
  timelineCardMobile: { padding: 20, borderRadius: 20, gap: 10 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timelineRowCompact: { gap: 8 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
  timelineDotCompact: { width: 10, height: 10, borderRadius: 5 },
  timelineInfo: { flex: 1 },
  timelineTime: { color: colors.textPrimary, fontWeight: '600' },
  timelineTimeCompact: { fontSize: 14 },
  timelineLabel: { color: colors.textSecondary },
  timelineLabelCompact: { fontSize: 13 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
  },
  timelineDotPending: { backgroundColor: colors.accent },
  timelineDotGood: { backgroundColor: '#4ade80' },
  timelineDotNeutral: { backgroundColor: '#a1a1aa' },
  timelineDotWarning: { backgroundColor: '#facc15' },
  timelineDotDanger: { backgroundColor: '#f87171' },
  statusNeutral: { backgroundColor: 'rgba(161,161,170,0.15)', color: '#a1a1aa' },
  statusWarning: { backgroundColor: 'rgba(251,191,36,0.15)', color: '#facc15' },
  statusDanger: { backgroundColor: 'rgba(248,113,113,0.15)', color: '#f87171' },
  statusBadgeCompact: { paddingHorizontal: 8, paddingVertical: 3, fontSize: 11 },
  statusGood: { backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  statusPending: { backgroundColor: 'rgba(251,191,36,0.15)', color: '#facc15' },
  placeholder: { color: colors.textSecondary },
});
