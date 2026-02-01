import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScheduleModal } from '@components/ScheduleModal';
import { colors, shadows } from '@theme/colors';
import { DateTime } from 'luxon';
import { rrulestr } from 'rrule';
import { usePillStore } from '@store/pillStore';
import { useScheduleStore } from '@store/scheduleStore';
import type { ScheduleItem } from '@types';

type ScheduledDose = {
  scheduleId: string;
  title: string;
  time: DateTime;
  items: ScheduleItem[];
};

export const ScheduleScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const isMobile = width < 500;
  const isSmallMobile = width < 400;
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(DateTime.now().toISODate()!);
  const [currentWeekStart, setCurrentWeekStart] = useState(DateTime.now().startOf('week'));

  const { pills, loadPills } = usePillStore();
  const { schedules, loadSchedules, addSchedule, archiveSchedule } = useScheduleStore();

  useEffect(() => {
    loadPills();
    loadSchedules();
  }, [loadPills, loadSchedules]);

  /** Build pill options: all pills with a valid cartridge index (0-2) */
  const pillOptions = useMemo(() => {
    return Array.from(pills.values())
      .filter((pill) => pill.cartridgeIndex != null && pill.cartridgeIndex >= 0 && pill.cartridgeIndex < 3)
      .map((pill) => ({ id: pill.id, name: pill.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pills]);

  /** Compute scheduled doses for the selected date from RRULE expansion */
  const scheduledDoses = useMemo(() => {
    const dayStart = DateTime.fromISO(selectedDate).startOf('day');
    const dayEnd = DateTime.fromISO(selectedDate).endOf('day');
    const doses: ScheduledDose[] = [];

    for (const schedule of schedules) {
      if (schedule.status !== 'ACTIVE') continue;
      try {
        const dtstart = new Date(schedule.startDateISO);
        const rule = rrulestr(schedule.rrule, { dtstart });
        const occurrences = rule.between(dayStart.toJSDate(), dayEnd.toJSDate(), true);
        for (const occ of occurrences) {
          doses.push({
            scheduleId: schedule.id,
            title: schedule.title || 'Medication',
            time: DateTime.fromJSDate(occ),
            items: schedule.items,
          });
        }
      } catch {
        // Skip schedules with invalid RRULE
      }
    }

    return doses.sort((a, b) => a.time.toMillis() - b.time.toMillis());
  }, [schedules, selectedDate]);

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

  const handleSave = async (payload: { pillId: string; time: string; frequency: 'once' | 'daily' | 'weekly' }) => {
    try {
      const pill = pills.get(payload.pillId);
      const pillName = pill?.name || 'Medication';
      const startISO = `${selectedDate}T${payload.time}:00`;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const rruleMap: Record<string, string> = {
        once: 'RRULE:FREQ=DAILY;COUNT=1',
        daily: 'RRULE:FREQ=DAILY',
        weekly: 'RRULE:FREQ=WEEKLY',
      };
      const freqLabel = payload.frequency === 'once' ? '' : ` (${payload.frequency})`;

      await addSchedule({
        title: `${pillName} at ${payload.time}${freqLabel}`,
        timezone: tz,
        rrule: rruleMap[payload.frequency],
        startDateISO: DateTime.fromISO(startISO, { zone: tz }).toUTC().toISO()!,
        lockoutMinutes: 60,
        items: [{ medicationId: payload.pillId, qty: 1 }],
      });

      setModalVisible(false);
      Alert.alert('Scheduled', `${pillName} scheduled at ${payload.time}${freqLabel}.`);
    } catch (error: any) {
      Alert.alert('Failed', error?.message || 'Could not create schedule.');
    }
  };

  const handleDelete = (scheduleId: string, title: string) => {
    Alert.alert('Remove Schedule', `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await archiveSchedule(scheduleId);
          } catch {
            Alert.alert('Error', 'Could not remove schedule.');
          }
        },
      },
    ]);
  };

  /** Build medication label for a dose */
  const doseLabel = (items: ScheduleItem[]) => {
    return items
      .map((item) => {
        const pill = pills.get(item.pillId);
        return pill ? `${item.qty}x ${pill.name}` : `${item.qty}x medication`;
      })
      .join(', ');
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
              <Text style={[styles.statValue, isSmallMobile && styles.statValueSmall]}>{scheduledDoses.length}</Text>
              <Text style={[styles.statLabel, isSmallMobile && styles.statLabelSmall]}>Doses</Text>
            </View>
            <View style={[styles.statCard, isSmallMobile && styles.statCardSmall]}>
              <Text style={[styles.statValue, isSmallMobile && styles.statValueSmall]}>
                {schedules.filter((s) => s.status === 'ACTIVE').length}
              </Text>
              <Text style={[styles.statLabel, isSmallMobile && styles.statLabelSmall]}>Schedules</Text>
            </View>
          </View>
        </View>

        {/* Week navigation */}
        <View style={[styles.card, styles.weekCard, isCompact && styles.weekCardCompact]}>
          <View style={[styles.weekHeaderRow, isSmallMobile && styles.weekHeaderRowSmall]}>
            <TouchableOpacity style={[styles.weekNavButton, isSmallMobile && styles.weekNavButtonSmall]} onPress={goToPreviousWeek}>
              <Text style={[styles.weekNavText, isSmallMobile && styles.weekNavTextSmall]}>&#8249;</Text>
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, isSmallMobile && styles.sectionTitleSmall]}>
              Week of {currentWeekStart.toFormat('MMM dd')}
            </Text>
            <TouchableOpacity style={[styles.weekNavButton, isSmallMobile && styles.weekNavButtonSmall]} onPress={goToNextWeek}>
              <Text style={[styles.weekNavText, isSmallMobile && styles.weekNavTextSmall]}>&#8250;</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.weekRow, isCompact && styles.weekRowCompact, isMobile && styles.weekRowMobile]}>
            {weekDays.map((day) => {
              const iso = day.toISODate()!;
              const isActive = selectedDate === iso;
              return (
                <TouchableOpacity
                  key={iso}
                  style={[
                    styles.dayCard,
                    isCompact && styles.dayCardCompact,
                    isMobile && styles.dayCardMobile,
                    isActive && styles.dayCardActive,
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
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected day detail */}
        <View style={[styles.card, styles.selectedDayCard, isMobile && styles.selectedDayCardMobile]}>
          <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
            {DateTime.fromISO(selectedDate).toFormat('cccc, MMM d')}
          </Text>
          {scheduledDoses.length === 0 ? (
            <Text style={styles.placeholder}>No doses scheduled for this day.</Text>
          ) : (
            <View style={styles.doseList}>
              {scheduledDoses.map((dose, idx) => (
                <TouchableOpacity
                  key={`${dose.scheduleId}-${idx}`}
                  style={[styles.doseItem, isMobile && styles.doseItemMobile]}
                  onLongPress={() => handleDelete(dose.scheduleId, dose.title)}
                >
                  <View style={styles.doseTimeContainer}>
                    <Text style={[styles.doseTime, isMobile && styles.doseTimeMobile]}>
                      {dose.time.toFormat('h:mm a')}
                    </Text>
                  </View>
                  <View style={styles.doseInfo}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.doseName, isMobile && styles.doseNameMobile]} numberOfLines={1}>
                        {dose.title}
                      </Text>
                      <Text style={[styles.doseMeds, isMobile && styles.doseMedsMobile]} numberOfLines={1}>
                        {doseLabel(dose.items)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.doseStatus,
                        isMobile && styles.doseStatusMobile,
                        { backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#facc15' },
                      ]}
                    >
                      Scheduled
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
  heroStatsCompact: { width: '100%', justifyContent: 'space-between' },
  statCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: 70,
  },
  statCardSmall: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, minWidth: 60 },
  statValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  statValueSmall: { fontSize: 18 },
  statLabel: { color: colors.textSecondary, fontSize: 12 },
  statLabelSmall: { fontSize: 10 },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 12 },
  sectionTitleSmall: { fontSize: 15, marginBottom: 8 },
  sectionTitleMobile: { fontSize: 16, marginBottom: 8 },
  weekCard: { paddingBottom: 12, paddingHorizontal: 20 },
  weekCardCompact: { padding: 16, borderRadius: 20 },
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
  weekNavButtonSmall: { width: 32, height: 32, borderRadius: 16 },
  weekNavText: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
  weekNavTextSmall: { fontSize: 16 },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    paddingHorizontal: 4,
  },
  weekRowCompact: { flexWrap: 'wrap', columnGap: 8, rowGap: 10 },
  weekRowMobile: { flexWrap: 'nowrap', gap: 4, paddingHorizontal: 0, justifyContent: 'space-around' },
  dayCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 110,
    alignItems: 'center',
  },
  dayCardActive: { borderColor: colors.accent, backgroundColor: colors.surfaceAlt },
  dayCardCompact: { width: '46%', flexGrow: 1, minWidth: 100 },
  dayCardMobile: { flex: 1, minWidth: 40, maxWidth: 52, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 14 },
  dayLabel: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  dayLabelMobile: { fontSize: 11, marginBottom: 2 },
  dayLabelActive: { color: colors.textPrimary },
  dayDate: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  dayDateMobile: { fontSize: 16, marginBottom: 4 },
  selectedDayCard: { gap: 12 },
  selectedDayCardMobile: { padding: 16, borderRadius: 20, gap: 10 },
  doseList: { gap: 10 },
  doseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 14,
    gap: 14,
  },
  doseItemMobile: { padding: 12, borderRadius: 14, gap: 12 },
  doseTimeContainer: { minWidth: 80 },
  doseTime: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  doseTimeMobile: { fontSize: 14 },
  doseInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  doseName: { color: colors.textPrimary, fontSize: 16, fontWeight: '500' },
  doseNameMobile: { fontSize: 14 },
  doseMeds: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  doseMedsMobile: { fontSize: 12 },
  doseStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  doseStatusMobile: { paddingHorizontal: 8, paddingVertical: 3, fontSize: 11 },
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
  fabSmall: { right: 16, bottom: 20, width: 52, height: 52, borderRadius: 26 },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  fabTextSmall: { fontSize: 28 },
});
