import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadows } from '@theme/colors';
import { useTodayStore } from '@store/todayStore';
import { usePillStore } from '@store/pillStore';
import { eventLogRepository } from '@data/repositories/EventLogRepository';
import { DateTime } from 'luxon';
import { EventStatus } from '@types';

type WeeklyPoint = { day: string; ratio: number; taken: number; total: number };

export const TodayScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isCompact = width < 480;
  const isMobile = width < 768;
  const { events, loadTodayEvents } = useTodayStore();
  const { pills, loadPills } = usePillStore();
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyPoint[]>([]);

  const loadWeeklyTrend = useCallback(async () => {
    const end = DateTime.now().endOf('day');
    const start = end.minus({ days: 6 }).startOf('day');
    const logs = await eventLogRepository.getByDateRange(start.toISO()!, end.toISO()!);
    const buckets: Record<string, WeeklyPoint> = {};
    for (let i = 0; i < 7; i++) {
      const day = start.plus({ days: i });
      buckets[day.toISODate()!] = {
        day: day.toFormat('ccc'),
        ratio: 0,
        taken: 0,
        total: 0,
      };
    }
    logs.forEach((log) => {
      const dayKey = DateTime.fromISO(log.dueAtISO).toISODate();
      if (!dayKey || !buckets[dayKey]) return;
      buckets[dayKey].total += 1;
      if (log.status === EventStatus.TAKEN) {
        buckets[dayKey].taken += 1;
      }
    });
    setWeeklyTrend(
      Object.values(buckets).map((bucket) => ({
        ...bucket,
        ratio: bucket.total > 0 ? bucket.taken / bucket.total : 0,
      }))
    );
  }, []);

  useEffect(() => {
    loadPills();
    loadTodayEvents();
    loadWeeklyTrend();
  }, [loadPills, loadTodayEvents, loadWeeklyTrend]);

  const stats = useMemo(() => {
    const total = events.length;
    const taken = events.filter((e) => e.status === EventStatus.TAKEN).length;
    const missed = events.filter((e) => e.status === EventStatus.MISSED || e.status === EventStatus.FAILED)
      .length;
    const upcoming = events.filter(
      (e) => e.status === EventStatus.PENDING || e.status === EventStatus.SNOOZED
    ).length;
    return {
      adherence: total ? Math.round((taken / total) * 100) : 0,
      missed,
      upcoming,
    };
  }, [events]);

  const timeline = useMemo(() => {
    return [...events]
      .sort((a, b) => a.dueAtISO.localeCompare(b.dueAtISO))
      .map((event) => {
        let label = event.groupLabel;
        try {
          const details = JSON.parse(event.detailsJSON);
          if (details.items?.length) {
            label = details.items
              .map((item: any) => pills.get(item.pillId)?.name || 'Dose')
              .join(', ');
          }
        } catch {
          // ignore parse errors
        }
        return {
          id: event.id,
          time: DateTime.fromISO(event.dueAtISO).toFormat('h:mm a'),
          label,
          status: event.status,
        };
      });
  }, [events, pills]);

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
              <Text style={styles.metricLabel}>Missed</Text>
              <Text style={[styles.metricValue, isCompact && styles.metricValueCompact, stats.missed ? styles.metricDanger : null]}>
                {stats.missed}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.graphCard, isMobile && styles.graphCardMobile]}>
          <Text style={styles.sectionTitle}>Weekly Intake</Text>
          <View style={styles.weekBars}>
            {weeklyTrend.map((point) => (
              <View key={point.day} style={[styles.weekBar, isCompact && styles.weekBarCompact]}>
                <View
                  style={[
                    styles.barFill,
                    isCompact && styles.barFillCompact,
                    {
                      height: (isCompact ? 60 : 80) * point.ratio,
                      backgroundColor: colors.accent,
                    },
                  ]}
                />
                <Text style={[styles.barLabel, isCompact && styles.barLabelCompact]}>{point.day}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, styles.timelineCard, isMobile && styles.timelineCardMobile]}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          {timeline.length === 0 ? (
            <Text style={styles.placeholder}>No doses scheduled today.</Text>
          ) : (
            timeline.map((item) => (
              <View key={item.id} style={[styles.timelineRow, isCompact && styles.timelineRowCompact]}>
                <View style={[styles.timelineDot, isCompact && styles.timelineDotCompact]} />
                <View style={styles.timelineInfo}>
                  <Text style={[styles.timelineTime, isCompact && styles.timelineTimeCompact]}>{item.time}</Text>
                  <Text style={[styles.timelineLabel, isCompact && styles.timelineLabelCompact]}>{item.label}</Text>
                </View>
                <Text
                  style={[
                    styles.statusBadge,
                    isCompact && styles.statusBadgeCompact,
                    item.status === EventStatus.TAKEN ? styles.statusGood : styles.statusPending,
                  ]}
                >
                  {item.status === EventStatus.TAKEN ? 'Done' : 'Pending'}
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
  content: { padding: 20, gap: 20 },
  contentMobile: { padding: 16, gap: 16 },
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
  graphCard: { gap: 16 },
  graphCardMobile: { padding: 20, borderRadius: 20 },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
  weekBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  weekBar: { alignItems: 'center', gap: 8, flex: 1 },
  weekBarCompact: { gap: 6 },
  barFill: { width: 28, borderRadius: 18, backgroundColor: colors.accent },
  barFillCompact: { width: 20, borderRadius: 12 },
  barLabel: { color: colors.textSecondary, fontSize: 12 },
  barLabelCompact: { fontSize: 10 },
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
  statusBadgeCompact: { paddingHorizontal: 8, paddingVertical: 3, fontSize: 11 },
  statusGood: { backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  statusPending: { backgroundColor: 'rgba(251,191,36,0.15)', color: '#facc15' },
  placeholder: { color: colors.textSecondary },
});
