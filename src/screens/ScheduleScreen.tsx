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
  const isMobile = width < 500;
  const isSmallMobile = width < 400;
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
    // Only include medications that have hardware mappings AND exist in the pills store
    return Object.values(profiles)
      .filter((profile) => {
        // Ensure the pill exists in the store
        const pill = pills.get(profile.pillId);
        return pill !== undefined;
      })
      .map((profile) => {
        const pill = pills.get(profile.pillId);
        return {
          id: profile.pillId,
          name: pill?.name || `Medication ${profile.serialNumber}`,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically for better UX
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
      <ScrollView contentContainerStyle={[styles.content, isCompact && styles.contentCompact]}>
        <View style={[styles.card, styles.hero, isCompact && styles.heroCompact]}>
          <View style={styles.heroTextGroup}>
            <Text style={[styles.heroEyebrow, isSmallMobile && styles.heroEyebrowSmall]}>Week Planner</Text>
            <Text style={[styles.heroTitle, isSmallMobile && styles.heroTitleSmall]}>Medication Schedule</Text>
            <Text style={[styles.heroSubtitle, isSmallMobile && styles.heroSubtitleSmall]}>
              {DateTime.fromISO(selectedDate).toFormat(isSmallMobile ? 'ccc, MMM dd' : 'cccc, MMM dd, yyyy')}
            </Text>
          </View>
          <View style={[styles.heroStats, isCompact && styles.heroStatsCompact]}>
            <View style={[styles.statCard, isSmallMobile && styles.statCardSmall]}>
              <Text style={[styles.statValue, isSmallMobile && styles.statValueSmall]}>{selectedEvents.length}</Text>
              <Text style={[styles.statLabel, isSmallMobile && styles.statLabelSmall]}>Today</Text>
            </View>
            <View style={[styles.statCard, isSmallMobile && styles.statCardSmall]}>
              <Text style={[styles.statValue, isSmallMobile && styles.statValueSmall]}>{upcomingToday}</Text>
              <Text style={[styles.statLabel, isSmallMobile && styles.statLabelSmall]}>Upcoming</Text>
            </View>
            <View style={[styles.statCard, isSmallMobile && styles.statCardSmall]}>
              <Text style={[styles.statValue, isSmallMobile && styles.statValueSmall]}>
                {weekStats.total
                  ? Math.round((weekStats.taken / Math.max(weekStats.total, 1)) * 100)
                  : 0}
                %
              </Text>
              <Text style={[styles.statLabel, isSmallMobile && styles.statLabelSmall]}>Adherence</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.weekCard, isCompact && styles.weekCardCompact]}>
          <View style={[styles.weekHeaderRow, isSmallMobile && styles.weekHeaderRowSmall]}>
            <TouchableOpacity style={[styles.weekNavButton, isSmallMobile && styles.weekNavButtonSmall]} onPress={goToPreviousWeek}>
              <Text style={[styles.weekNavText, isSmallMobile && styles.weekNavTextSmall]}>‹</Text>
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, isSmallMobile && styles.sectionTitleSmall]}>Week of {currentWeekStart.toFormat('MMM dd')}</Text>
            <TouchableOpacity style={[styles.weekNavButton, isSmallMobile && styles.weekNavButtonSmall]} onPress={goToNextWeek}>
              <Text style={[styles.weekNavText, isSmallMobile && styles.weekNavTextSmall]}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.weekRow, isCompact && styles.weekRowCompact, isMobile && styles.weekRowMobile]}>
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
                    isMobile && styles.dayCardMobile,
                    isActive && styles.dayCardActive,
                    allTaken && styles.dayCardTaken,
                    anyMissed && styles.dayCardMissed,
                  ]}
                  onPress={() => {
                    setSelectedDate(iso);
                    setCurrentWeekStart(day.startOf('week'));
                  }}
                >
                  <Text style={[styles.dayLabel, isMobile && styles.dayLabelMobile, isActive && styles.dayLabelActive]}>
                    {day.toFormat(isMobile ? 'ccccc' : 'ccc')}
                  </Text>
                  <Text style={[styles.dayDate, isMobile && styles.dayDateMobile, isActive && styles.dayLabelActive]}>
                    {day.toFormat('dd')}
                  </Text>
                  {events.length > 0 && (
                    <View
                      style={[
                        styles.dayDotIndicator,
                        allTaken && styles.dayDotTaken,
                        anyMissed && styles.dayDotMissed,
                        !allTaken && !anyMissed && styles.dayDotActive,
                      ]}
                    />
                  )}
                  {!isMobile && events.slice(0, 2).map((entry) => (
                    <View
                      key={entry.id}
                      style={[
                        styles.pillChip,
                        isCompact && styles.pillChipCompact,
                        entry.status === EventStatus.TAKEN && styles.pillChipTaken,
                        [EventStatus.MISSED, EventStatus.FAILED, EventStatus.SKIPPED].includes(
                          entry.status
                        ) && styles.pillChipMissed,
                      ]}
                    >
                      <Text style={[styles.pillChipText, isCompact && styles.pillChipTextCompact]} numberOfLines={1}>
                        {entry.groupLabel} · {DateTime.fromISO(entry.dueAtISO).toFormat('h:mm a')}
                      </Text>
                    </View>
                  ))}
                  {!isMobile && events.length > 2 && (
                    <Text style={styles.moreChip}>+{events.length - 2} more</Text>
                  )}
                  {isMobile && events.length > 0 && (
                    <Text style={styles.eventCountBadge}>{events.length}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Day Detail Section */}
        <View style={[styles.card, styles.selectedDayCard, isMobile && styles.selectedDayCardMobile]}>
          <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
            {DateTime.fromISO(selectedDate).toFormat('cccc, MMM d')}
          </Text>
          {selectedEvents.length === 0 ? (
            <Text style={styles.placeholder}>No doses scheduled for this day.</Text>
          ) : (
            <View style={styles.doseList}>
              {selectedEvents.map((event) => {
                const statusColors = {
                  [EventStatus.TAKEN]: { bg: 'rgba(74, 222, 128, 0.15)', text: '#4ade80' },
                  [EventStatus.PENDING]: { bg: 'rgba(251, 191, 36, 0.15)', text: '#facc15' },
                  [EventStatus.MISSED]: { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171' },
                  [EventStatus.FAILED]: { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171' },
                  [EventStatus.SKIPPED]: { bg: 'rgba(161, 161, 170, 0.15)', text: '#a1a1aa' },
                  [EventStatus.SNOOZED]: { bg: 'rgba(251, 191, 36, 0.15)', text: '#facc15' },
                };
                const statusStyle = statusColors[event.status] || statusColors[EventStatus.PENDING];
                return (
                  <View key={event.id} style={[styles.doseItem, isMobile && styles.doseItemMobile]}>
                    <View style={styles.doseTimeContainer}>
                      <Text style={[styles.doseTime, isMobile && styles.doseTimeMobile]}>
                        {DateTime.fromISO(event.dueAtISO).toFormat('h:mm a')}
                      </Text>
                    </View>
                    <View style={styles.doseInfo}>
                      <Text style={[styles.doseName, isMobile && styles.doseNameMobile]} numberOfLines={1}>
                        {event.groupLabel}
                      </Text>
                      <Text
                        style={[
                          styles.doseStatus,
                          isMobile && styles.doseStatusMobile,
                          { backgroundColor: statusStyle.bg, color: statusStyle.text },
                        ]}
                      >
                        {event.status === EventStatus.TAKEN ? 'Taken' :
                         event.status === EventStatus.PENDING ? 'Pending' :
                         event.status === EventStatus.MISSED ? 'Missed' :
                         event.status === EventStatus.SNOOZED ? 'Snoozed' :
                         event.status === EventStatus.SKIPPED ? 'Skipped' : 'Failed'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={[styles.card, styles.notesCard, isMobile && styles.notesCardMobile]}>
          <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>Provider Notes</Text>
          <Text style={styles.placeholder}>
            {findNote('providerNotes') || 'No Provider Notes for this day.'}
          </Text>
        </View>
        <View style={[styles.card, styles.notesCard, isMobile && styles.notesCardMobile]}>
          <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>Personal Notes</Text>
          <Text style={styles.placeholder}>
            {findNote('additionalNotes') || 'Add your own reminders.'}
          </Text>
        </View>
      </ScrollView>

      <TouchableOpacity style={[styles.fab, isSmallMobile && styles.fabSmall]} onPress={() => setModalVisible(true)}>
        <Text style={[styles.fabText, isSmallMobile && styles.fabTextSmall]}>+</Text>
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
  contentCompact: { paddingHorizontal: 16, paddingVertical: 20, gap: 16 },
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
    padding: 20,
    borderRadius: 20,
  },
  heroTextGroup: { gap: 8, flex: 1 },
  heroEyebrow: {
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
  },
  heroEyebrowSmall: { fontSize: 10 },
  heroTitle: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  heroTitleSmall: { fontSize: 22 },
  heroSubtitle: { color: colors.textSecondary, fontSize: 16 },
  heroSubtitleSmall: { fontSize: 14 },
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
  statCardSmall: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    minWidth: 60,
  },
  statValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  statValueSmall: { fontSize: 18 },
  statLabel: { color: colors.textSecondary, fontSize: 12 },
  statLabelSmall: { fontSize: 10 },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 12 },
  sectionTitleSmall: { fontSize: 15, marginBottom: 8 },
  weekCard: { paddingBottom: 12, height: 240, paddingHorizontal: 20 },
  weekCardCompact: {
    height: undefined,
    padding: 16,
    borderRadius: 20,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weekHeaderRowSmall: { marginBottom: 12 },
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
  weekNavButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  weekNavText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  weekNavTextSmall: { fontSize: 16 },
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
  weekRowMobile: {
    flexWrap: 'nowrap',
    gap: 4,
    paddingHorizontal: 0,
    justifyContent: 'space-around',
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
    minWidth: 100,
  },
  dayCardMobile: {
    flex: 1,
    minWidth: 40,
    maxWidth: 52,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    alignItems: 'center',
  },
  dayLabel: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  dayLabelMobile: { fontSize: 11, marginBottom: 2 },
  dayLabelActive: { color: colors.textPrimary },
  dayDate: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  dayDateMobile: { fontSize: 16, marginBottom: 4 },
  dayDotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
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
  eventCountBadge: {
    backgroundColor: colors.accentSoft,
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    overflow: 'hidden',
  },
  pillChip: {
    backgroundColor: colors.accentSoft,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 12,
    marginBottom: 6,
  },
  pillChipCompact: {
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRadius: 10,
    marginBottom: 4,
  },
  pillChipTaken: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  pillChipMissed: {
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
  },
  pillChipText: { color: colors.textPrimary, fontSize: 12 },
  pillChipTextCompact: { fontSize: 10 },
  moreChip: { color: colors.textSecondary, fontSize: 12 },
  selectedDayCard: { gap: 12 },
  selectedDayCardMobile: { padding: 16, borderRadius: 20, gap: 10 },
  sectionTitleMobile: { fontSize: 16, marginBottom: 8 },
  doseList: { gap: 10 },
  doseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 14,
    gap: 14,
  },
  doseItemMobile: {
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  doseTimeContainer: {
    minWidth: 80,
  },
  doseTime: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  doseTimeMobile: {
    fontSize: 14,
  },
  doseInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  doseName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  doseNameMobile: {
    fontSize: 14,
  },
  doseStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  doseStatusMobile: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
  },
  notesCard: { minHeight: 110 },
  notesCardCompact: {
    width: '100%',
  },
  notesCardMobile: {
    padding: 16,
    borderRadius: 20,
    minHeight: 90,
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
  fabSmall: {
    right: 16,
    bottom: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  fabTextSmall: { fontSize: 28 },
});
