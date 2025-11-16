import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScheduleModal } from '@components/ScheduleModal';
import { colors, shadows } from '@theme/colors';
import { DateTime } from 'luxon';
import { eventLogRepository } from '@data/repositories/EventLogRepository';
import { usePillStore } from '@store/pillStore';
import { useHardwareStore } from '@store/hardwareStore';
import { EventStatus, EventLog } from '@types';

export const ScheduleScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(DateTime.now().toISODate()!);
  const [eventsByWeek, setEventsByWeek] = useState<Record<string, Record<string, EventLog[]>>>({});
  const [currentWeekStart, setCurrentWeekStart] = useState(DateTime.now().startOf('week'));

  const { pills, loadPills } = usePillStore();
  const { profiles, loadProfiles } = useHardwareStore();

  const fetchWeek = useCallback(
    async (weekStart: DateTime) => {
      const key = weekStart.toISODate()!;
      const startISO = weekStart.startOf('day').toISO()!;
      const endISO = weekStart.plus({ days: 6 }).endOf('day').toISO()!;
      const weekEvents = await eventLogRepository.getByDateRange(startISO, endISO);
      const grouped: Record<string, EventLog[]> = {};
      weekEvents.forEach((event) => {
        const day = DateTime.fromISO(event.dueAtISO).toISODate();
        if (!day) return;
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(event);
      });
      setEventsByWeek((prev) => ({ ...prev, [key]: grouped }));
    },
    []
  );

  useEffect(() => {
    loadPills();
    loadProfiles();
  }, [loadPills, loadProfiles]);

  useEffect(() => {
    fetchWeek(currentWeekStart);
  }, [currentWeekStart, fetchWeek]);

  useEffect(() => {
    const dt = DateTime.fromISO(selectedDate);
    if (dt.isValid) {
      const weekStart = dt.startOf('week');
      setCurrentWeekStart(weekStart);
      fetchWeek(weekStart);
    }
  }, [selectedDate, fetchWeek]);

  const getDayEvents = useCallback(
    (weekStart: DateTime, dayISO: string) => {
      const key = weekStart.toISODate()!;
      return (eventsByWeek[key]?.[dayISO] || []).sort((a, b) =>
        a.dueAtISO.localeCompare(b.dueAtISO)
      );
    },
    [eventsByWeek]
  );

  const selectedEvents = useMemo(() => {
    const weekKey = DateTime.fromISO(selectedDate).startOf('week').toISODate()!;
    return (eventsByWeek[weekKey]?.[selectedDate] || []).sort((a, b) =>
      a.dueAtISO.localeCompare(b.dueAtISO)
    );
  }, [eventsByWeek, selectedDate]);

  const currentWeekKey = currentWeekStart.toISODate()!;

  const weekStats = useMemo(() => {
    const bucket = eventsByWeek[currentWeekKey];
    if (!bucket) return { total: 0, taken: 0 };
    let total = 0;
    let taken = 0;
    Object.values(bucket).forEach((entries) => {
      total += entries.length;
      taken += entries.filter((entry) => entry.status === EventStatus.TAKEN).length;
    });
    return { total, taken };
  }, [currentWeekKey, eventsByWeek]);

  const upcomingToday = useMemo(
    () => selectedEvents.filter((event) => event.status === EventStatus.PENDING).length,
    [selectedEvents]
  );

  const pillOptions = useMemo(() => {
    return Object.values(profiles).map((profile) => ({
      id: profile.pillId,
      name: pills.get(profile.pillId)?.name || `Medication ${profile.serialNumber}`,
    }));
  }, [profiles, pills]);

  const handleSave = async (payload: {
    pillId: string;
    time: string;
    providerNotes: string;
    personalNotes: string;
  }) => {
    const due = DateTime.fromISO(`${selectedDate}T${payload.time}`);
    if (!due.isValid) {
      alert('Invalid time');
      return;
    }
    const pill = pills.get(payload.pillId);
    await eventLogRepository.create({
      dueAtISO: due.toISO()!,
      groupLabel: pill?.name || 'Dose',
      status: EventStatus.PENDING,
      detailsJSON: JSON.stringify({
        items: pill ? [{ pillId: pill.id, qty: 1 }] : [],
        providerNotes: payload.providerNotes,
        additionalNotes: payload.personalNotes,
      }),
    });
    const weekStart = due.startOf('week');
    setEventsByWeek((prev) => {
      const next = { ...prev };
      delete next[weekStart.toISODate()!];
      return next;
    });
    await fetchWeek(weekStart);
    setModalVisible(false);
  };

  const findNote = (key: 'providerNotes' | 'additionalNotes') => {
    for (const event of selectedEvents) {
      try {
        const details = JSON.parse(event.detailsJSON);
        if (details[key]) return details[key];
      } catch {
        continue;
      }
    }
    return null;
  };

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, idx) => currentWeekStart.plus({ days: idx })),
    [currentWeekStart]
  );

  const goToPreviousWeek = () => {
    const prev = currentWeekStart.minus({ weeks: 1 });
    setCurrentWeekStart(prev);
    setSelectedDate(prev.toISODate()!);
  };

  const goToNextWeek = () => {
    const next = currentWeekStart.plus({ weeks: 1 });
    setCurrentWeekStart(next);
    setSelectedDate(next.toISODate()!);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, styles.hero, isCompact && styles.heroCompact]}>
          <View style={styles.heroTextGroup}>
            <Text style={styles.heroEyebrow}>Week Planner</Text>
            <Text style={styles.heroTitle}>Medication Schedule</Text>
            <Text style={styles.heroSubtitle}>
              {DateTime.fromISO(selectedDate).toFormat('cccc, MMM dd, yyyy')}
            </Text>
          </View>
          <View style={[styles.heroStats, isCompact && styles.heroStatsCompact]}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{selectedEvents.length}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{upcomingToday}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {weekStats.total
                  ? Math.round((weekStats.taken / Math.max(weekStats.total, 1)) * 100)
                  : 0}
                %
              </Text>
              <Text style={styles.statLabel}>Adherence</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.weekCard, isCompact && styles.weekCardCompact]}>
          <View style={styles.weekHeaderRow}>
            <TouchableOpacity style={styles.weekNavButton} onPress={goToPreviousWeek}>
              <Text style={styles.weekNavText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>Week of {currentWeekStart.toFormat('MMM dd')}</Text>
            <TouchableOpacity style={styles.weekNavButton} onPress={goToNextWeek}>
              <Text style={styles.weekNavText}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.weekRow, isCompact && styles.weekRowCompact]}>
            {weekDays.map((day) => {
              const iso = day.toISODate()!;
              const events = getDayEvents(currentWeekStart, iso);
              const isActive = selectedDate === iso;
              const allTaken =
                events.length > 0 && events.every((event) => event.status === EventStatus.TAKEN);
              const anyMissed = events.some((event) =>
                [EventStatus.MISSED, EventStatus.FAILED, EventStatus.SKIPPED].includes(event.status)
              );
              return (
                <TouchableOpacity
                  key={iso}
                  style={[
                    styles.dayCard,
                    isCompact && styles.dayCardCompact,
                    isActive && styles.dayCardActive,
                    allTaken && styles.dayCardTaken,
                    anyMissed && styles.dayCardMissed,
                  ]}
                  onPress={() => {
                    setSelectedDate(iso);
                    setCurrentWeekStart(day.startOf('week'));
                  }}
                >
                  <View style={styles.dayHeaderRow}>
                    <Text style={[styles.dayLabel, isActive && styles.dayLabelActive]}>
                      {day.toFormat('ccc')}
                    </Text>
                    <View
                      style={[
                        styles.dayDot,
                        events.length > 0 && styles.dayDotActive,
                        allTaken && styles.dayDotTaken,
                        anyMissed && styles.dayDotMissed,
                        isActive && styles.dayDotFocused,
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayDate, isActive && styles.dayLabelActive]}>
                    {day.toFormat('dd')}
                  </Text>
                  {events.slice(0, 2).map((entry) => (
                    <View
                      key={entry.id}
                      style={[
                        styles.pillChip,
                        entry.status === EventStatus.TAKEN && styles.pillChipTaken,
                        [EventStatus.MISSED, EventStatus.FAILED, EventStatus.SKIPPED].includes(
                          entry.status
                        ) && styles.pillChipMissed,
                      ]}
                    >
                      <Text style={styles.pillChipText}>
                        {entry.groupLabel} · {DateTime.fromISO(entry.dueAtISO).toFormat('h:mm a')}
                      </Text>
                    </View>
                  ))}
                  {events.length > 2 && (
                    <Text style={styles.moreChip}>+{events.length - 2} more</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, styles.notesCard, isCompact && styles.notesCardCompact]}>
          <Text style={styles.sectionTitle}>Provider Notes</Text>
          <Text style={styles.placeholder}>
            {findNote('providerNotes') || 'No Provider Notes for this day.'}
          </Text>
        </View>
        <View style={[styles.card, styles.notesCard, isCompact && styles.notesCardCompact]}>
          <Text style={styles.sectionTitle}>Personal Notes</Text>
          <Text style={styles.placeholder}>
            {findNote('additionalNotes') || 'Add your own reminders.'}
          </Text>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <ScheduleModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        selectedDate={selectedDate}
        pillOptions={pillOptions}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingVertical: 28, gap: 24 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 28,
    ...shadows.card,
  },
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  heroCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 20,
  },
  heroTextGroup: { gap: 8, flex: 1 },
  heroEyebrow: {
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
  },
  heroTitle: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  heroSubtitle: { color: colors.textSecondary, fontSize: 16 },
  heroStats: { flexDirection: 'row', gap: 12 },
  heroStatsCompact: {
    width: '100%',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: 70,
  },
  statValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  statLabel: { color: colors.textSecondary, fontSize: 12 },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 12 },
  weekCard: { paddingBottom: 12, height: 240, paddingHorizontal: 20 },
  weekCardCompact: {
    height: undefined,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weekNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    paddingHorizontal: 4,
  },
  weekRowCompact: {
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 10,
  },
  dayCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 110,
  },
  dayCardActive: { borderColor: colors.accent, backgroundColor: colors.surfaceAlt },
  dayCardTaken: {
    borderColor: '#4ade80',
  },
  dayCardMissed: {
    borderColor: '#f87171',
  },
  dayCardCompact: {
    width: '46%',
    flexGrow: 1,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: { color: colors.textSecondary, fontSize: 13 },
  dayLabelActive: { color: colors.textPrimary },
  dayDate: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dayDotActive: {
    backgroundColor: colors.accentSoft,
  },
  dayDotTaken: {
    backgroundColor: '#4ade80',
  },
  dayDotMissed: {
    backgroundColor: '#f87171',
  },
  dayDotFocused: {
    backgroundColor: colors.accent,
  },
  pillChip: {
    backgroundColor: colors.accentSoft,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 12,
    marginBottom: 6,
  },
  pillChipTaken: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  pillChipMissed: {
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
  },
  pillChipText: { color: colors.textPrimary, fontSize: 12 },
  moreChip: { color: colors.textSecondary, fontSize: 12 },
  notesCard: { minHeight: 110 },
  notesCardCompact: {
    width: '100%',
  },
  placeholder: { color: colors.textSecondary },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '700' },
});
