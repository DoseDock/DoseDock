import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadows } from '@theme/colors';
import { useTodayStore } from '@store/todayStore';
import { usePillStore } from '@store/pillStore';
import { eventLogRepository } from '@data/repositories/EventLogRepository';
import { DateTime } from 'luxon';
import { EventStatus } from '@types';

type WeeklyPoint = { day: string; ratio: number; taken: number; total: number };

export const TodayScreen: React.FC = () => {
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, styles.hero]}>
          <Text style={styles.heroTitle}>Daily Overview</Text>
          <Text style={styles.heroSubtitle}>
            {DateTime.now().toFormat('cccc, LLL dd')}
          </Text>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Adherence</Text>
              <Text style={styles.metricValue}>{stats.adherence}%</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Upcoming</Text>
              <Text style={styles.metricValue}>{stats.upcoming}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Missed</Text>
              <Text style={[styles.metricValue, stats.missed ? styles.metricDanger : null]}>
                {stats.missed}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.graphCard]}>
          <Text style={styles.sectionTitle}>Weekly Intake</Text>
          <View style={styles.weekBars}>
            {weeklyTrend.map((point) => (
              <View key={point.day} style={styles.weekBar}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: 80 * point.ratio,
                      backgroundColor: colors.accent,
                    },
                  ]}
                />
                <Text style={styles.barLabel}>{point.day}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, styles.timelineCard]}>
          <Text style={styles.sectionTitle}>Today’s Schedule</Text>
          {timeline.length === 0 ? (
            <Text style={styles.placeholder}>No doses scheduled today.</Text>
          ) : (
            timeline.map((item) => (
              <View key={item.id} style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineInfo}>
                  <Text style={styles.timelineTime}>{item.time}</Text>
                  <Text style={styles.timelineLabel}>{item.label}</Text>
                </View>
                <Text
                  style={[
                    styles.statusBadge,
                    item.status === EventStatus.TAKEN ? styles.statusGood : styles.statusPending,
                  ]}
                >
                  {item.status === EventStatus.TAKEN ? 'Complete' : 'Pending'}
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    ...shadows.card,
  },
  hero: { gap: 16 },
  heroTitle: { color: colors.textPrimary, fontSize: 26, fontWeight: '700' },
  heroSubtitle: { color: colors.textSecondary },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { flex: 1, gap: 6 },
  metricLabel: { color: colors.textSecondary, fontSize: 13 },
  metricValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  metricDanger: { color: colors.danger },
  graphCard: { gap: 16 },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
  weekBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  weekBar: { alignItems: 'center', gap: 8 },
  barFill: { width: 28, borderRadius: 18, backgroundColor: colors.accent },
  barLabel: { color: colors.textSecondary, fontSize: 12 },
  timelineCard: { gap: 12 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
  timelineInfo: { flex: 1 },
  timelineTime: { color: colors.textPrimary, fontWeight: '600' },
  timelineLabel: { color: colors.textSecondary },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
  },
  statusGood: { backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  statusPending: { backgroundColor: 'rgba(251,191,36,0.15)', color: '#facc15' },
  placeholder: { color: colors.textSecondary },
});
