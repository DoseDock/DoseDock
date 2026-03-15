import React, { useEffect, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadows } from '@theme/colors';
import { useTodayStore } from '@store/todayStore';
import { useScheduleStore } from '@store/scheduleStore';
import { usePillStore } from '@store/pillStore';
import { DateTime } from 'luxon';
import { rrulestr } from 'rrule';
import type { ScheduleItem } from '@types';

type DoseStatus = 'SCHEDULED' | 'TAKEN' | 'MISSED' | 'SKIPPED';

type ScheduledDose = {
  scheduleId: string;
  title: string;
  time: DateTime;
  items: ScheduleItem[];
  status: DoseStatus;
};

export const TodayScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isCompact = width < 480;
  const isMobile = width < 768;
  const { historyEvents, loadHistoryEvents } = useTodayStore();
  const { schedules, loadSchedules } = useScheduleStore();
  const { pills, loadPills } = usePillStore();

  useEffect(() => {
    loadPills();
    loadSchedules();
    loadHistoryEvents(7); // Load recent history for status checking
  }, [loadPills, loadSchedules, loadHistoryEvents]);

  // Expand schedules for today (same logic as ScheduleScreen)
  const todaysDoses = useMemo(() => {
    const today = DateTime.now();
    const dayStart = today.startOf('day');
    const dayEnd = today.endOf('day');
    const now = DateTime.now();
    const doses: ScheduledDose[] = [];

    // Create a lookup for recorded events by scheduleId + time
    const eventLookup = new Map<string, string>();
    for (const event of historyEvents) {
      const eventTime = DateTime.fromISO(event.dueAtISO);
      const key = `${event.scheduleId}|${eventTime.toFormat('yyyy-MM-dd HH:mm')}`;
      eventLookup.set(key, event.status);
    }

    for (const schedule of schedules) {
      if (schedule.status !== 'ACTIVE') continue;
      try {
        const dtstart = new Date(schedule.startDateISO);
        const rule = rrulestr(schedule.rrule, { dtstart });
        const occurrences = rule.between(dayStart.toJSDate(), dayEnd.toJSDate(), true);
        for (const occ of occurrences) {
          const doseTime = DateTime.fromJSDate(occ);
          const eventKey = `${schedule.id}|${doseTime.toFormat('yyyy-MM-dd HH:mm')}`;
          const recordedStatus = eventLookup.get(eventKey);

          let status: DoseStatus;
          if (recordedStatus === 'TAKEN') {
            status = 'TAKEN';
          } else if (recordedStatus === 'SKIPPED') {
            status = 'SKIPPED';
          } else if (doseTime < now) {
            status = 'MISSED';
          } else {
            status = 'SCHEDULED';
          }

          doses.push({
            scheduleId: schedule.id,
            title: schedule.title || 'Medication',
            time: doseTime,
            items: schedule.items,
            status,
          });
        }
      } catch {
        // Skip schedules with invalid RRULE
      }
    }

    return doses.sort((a, b) => a.time.toMillis() - b.time.toMillis());
  }, [schedules, historyEvents]);

  // Compute stats from today's doses
  const stats = useMemo(() => {
    const total = todaysDoses.length;
    const taken = todaysDoses.filter((d) => d.status === 'TAKEN').length;
    const missed = todaysDoses.filter((d) => d.status === 'MISSED').length;
    const upcoming = todaysDoses.filter((d) => d.status === 'SCHEDULED').length;

    return {
      adherence: total ? Math.round((taken / (taken + missed || 1)) * 100) : 100,
      taken,
      upcoming,
      missed,
      total,
    };
  }, [todaysDoses]);

  // Get medication names for a dose
  const getMedicationNames = (items: ScheduleItem[]) => {
    return items
      .map((item) => {
        const pill = pills.get(item.pillId);
        return pill ? pill.label : 'Medication';
      })
      .join(', ');
  };

  // Find next upcoming dose
  const nextDose = useMemo(() => {
    return todaysDoses.find((d) => d.status === 'SCHEDULED');
  }, [todaysDoses]);

  const getStatusLabel = (status: DoseStatus) => {
    switch (status) {
      case 'TAKEN': return 'Taken';
      case 'SKIPPED': return 'Skipped';
      case 'MISSED': return 'Missed';
      default: return 'Upcoming';
    }
  };

  const getStatusStyle = (status: DoseStatus) => {
    switch (status) {
      case 'TAKEN': return styles.statusGood;
      case 'SKIPPED': return styles.statusNeutral;
      case 'MISSED': return styles.statusDanger;
      default: return styles.statusPending;
    }
  };

  const getDotStyle = (status: DoseStatus) => {
    switch (status) {
      case 'TAKEN': return styles.timelineDotGood;
      case 'SKIPPED': return styles.timelineDotNeutral;
      case 'MISSED': return styles.timelineDotDanger;
      default: return styles.timelineDotPending;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}>
        {/* Hero Section */}
        <View style={[styles.card, styles.hero, isMobile && styles.heroMobile]}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={[styles.heroTitle, isCompact && styles.heroTitleCompact]}>Today</Text>
              <Text style={styles.heroSubtitle}>
                {DateTime.now().toFormat('cccc, MMMM d')}
              </Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={[styles.metricsRow, isCompact && styles.metricsRowCompact]}>
            <View style={[styles.metricCard, styles.metricCardPrimary, isCompact && styles.metricCardCompact]}>
              <Text style={styles.metricValue}>{stats.adherence}%</Text>
              <Text style={styles.metricLabel}>Adherence</Text>
            </View>
            <View style={[styles.metricCard, isCompact && styles.metricCardCompact]}>
              <Text style={styles.metricValue}>{stats.taken}</Text>
              <Text style={styles.metricLabel}>Taken</Text>
            </View>
            <View style={[styles.metricCard, isCompact && styles.metricCardCompact]}>
              <Text style={styles.metricValue}>{stats.upcoming}</Text>
              <Text style={styles.metricLabel}>Upcoming</Text>
            </View>
            {stats.missed > 0 && (
              <View style={[styles.metricCard, styles.metricCardDanger, isCompact && styles.metricCardCompact]}>
                <Text style={[styles.metricValue, styles.metricValueDanger]}>{stats.missed}</Text>
                <Text style={styles.metricLabel}>Missed</Text>
              </View>
            )}
          </View>
        </View>

        {/* Next Dose Card */}
        {nextDose && (
          <View style={[styles.card, styles.nextDoseCard, isMobile && styles.nextDoseCardMobile]}>
            <Text style={styles.nextDoseLabel}>Next Dose</Text>
            <View style={styles.nextDoseContent}>
              <View style={styles.nextDoseInfo}>
                <Text style={[styles.nextDoseTime, isCompact && styles.nextDoseTimeCompact]}>
                  {nextDose.time.toFormat('h:mm a')}
                </Text>
                <Text style={styles.nextDoseMedication}>
                  {getMedicationNames(nextDose.items)}
                </Text>
              </View>
              <View style={styles.nextDoseCountdown}>
                <Text style={styles.nextDoseIn}>
                  in {nextDose.time.diff(DateTime.now(), 'minutes').minutes < 60
                    ? `${Math.ceil(nextDose.time.diff(DateTime.now(), 'minutes').minutes)} min`
                    : `${Math.round(nextDose.time.diff(DateTime.now(), 'hours').hours)} hr`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Timeline Section */}
        <View style={[styles.card, styles.timelineCard, isMobile && styles.timelineCardMobile]}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          {todaysDoses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No doses scheduled for today</Text>
              <Text style={styles.emptyStateSubtext}>
                Add medications to silos and create schedules to get started
              </Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {todaysDoses.map((dose, idx) => (
                <View key={`${dose.scheduleId}-${idx}`} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, getDotStyle(dose.status)]} />
                    {idx < todaysDoses.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={[styles.timelineContent, isCompact && styles.timelineContentCompact]}>
                    <View style={styles.timelineHeader}>
                      <Text style={[styles.timelineTime, isCompact && styles.timelineTimeCompact]}>
                        {dose.time.toFormat('h:mm a')}
                      </Text>
                      <Text style={[styles.statusBadge, isCompact && styles.statusBadgeCompact, getStatusStyle(dose.status)]}>
                        {getStatusLabel(dose.status)}
                      </Text>
                    </View>
                    <Text style={[styles.timelineMedication, isCompact && styles.timelineMedicationCompact]} numberOfLines={1}>
                      {getMedicationNames(dose.items)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  contentMobile: { paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    ...shadows.card,
  },
  hero: { gap: 20 },
  heroMobile: { padding: 16, borderRadius: 16 },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTitle: { color: colors.textPrimary, fontSize: 32, fontWeight: '700' },
  heroTitleCompact: { fontSize: 26 },
  heroSubtitle: { color: colors.textSecondary, fontSize: 16, marginTop: 4 },
  metricsRow: { flexDirection: 'row', gap: 10 },
  metricsRowCompact: { gap: 8, flexWrap: 'wrap' },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    minWidth: 70,
  },
  metricCardCompact: { padding: 10, borderRadius: 12 },
  metricCardPrimary: {
    backgroundColor: colors.accent,
  },
  metricCardDanger: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  metricValue: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  metricValueDanger: { color: '#f87171' },
  metricLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  nextDoseCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  nextDoseCardMobile: { padding: 16, borderRadius: 16 },
  nextDoseLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  nextDoseContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextDoseInfo: { flex: 1 },
  nextDoseTime: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  nextDoseTimeCompact: { fontSize: 24 },
  nextDoseMedication: { color: colors.textSecondary, fontSize: 15, marginTop: 2 },
  nextDoseCountdown: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  nextDoseIn: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 16 },
  timelineCard: {},
  timelineCardMobile: { padding: 16, borderRadius: 16 },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: { color: colors.textPrimary, fontSize: 16, fontWeight: '500' },
  emptyStateSubtext: { color: colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' },
  timeline: { gap: 0 },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 20,
    paddingLeft: 12,
  },
  timelineContentCompact: { paddingBottom: 16 },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineTime: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  timelineTimeCompact: { fontSize: 15 },
  timelineMedication: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  timelineMedicationCompact: { fontSize: 13 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  statusBadgeCompact: { paddingHorizontal: 8, paddingVertical: 3, fontSize: 11 },
  timelineDotPending: { backgroundColor: colors.accent },
  timelineDotGood: { backgroundColor: '#4ade80' },
  timelineDotNeutral: { backgroundColor: '#a1a1aa' },
  timelineDotDanger: { backgroundColor: '#f87171' },
  statusNeutral: { backgroundColor: 'rgba(161,161,170,0.15)', color: '#a1a1aa' },
  statusDanger: { backgroundColor: 'rgba(248,113,113,0.15)', color: '#f87171' },
  statusGood: { backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80' },
  statusPending: { backgroundColor: 'rgba(251,191,36,0.15)', color: '#facc15' },
});
