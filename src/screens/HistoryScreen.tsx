import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadows } from '@theme/colors';
import { DateTime } from 'luxon';
import { usePillStore } from '@store/pillStore';
import { useTodayStore } from '@store/todayStore';
import type { EventLog, EventStatus } from '@types';

const presets = [
  { label: '3 days', days: 3 },
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
];

const statusOptions: Array<{ label: string; value: string }> = [
  { label: 'All', value: 'all' },
  { label: 'Taken', value: 'TAKEN' },
  { label: 'Missed', value: 'MISSED' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Skipped', value: 'SKIPPED' },
];

export const HistoryScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const isSmallMobile = width < 400;
  const { pills, loadPills } = usePillStore();
  const { events, loadTodayEvents } = useTodayStore();
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadPills();
    loadTodayEvents();
  }, [loadPills, loadTodayEvents]);

  /** Group events by day */
  const orderedHistory = useMemo(() => {
    const grouped: Record<string, EventLog[]> = {};
    const filtered =
      statusFilter === 'all'
        ? events
        : events.filter((e) => e.status === statusFilter);

    filtered.forEach((event) => {
      const day = DateTime.fromISO(event.dueAtISO).toISODate();
      if (!day) return;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(event);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, entries]) => ({
        date,
        entries: entries.sort((a, b) => a.dueAtISO.localeCompare(b.dueAtISO)),
      }));
  }, [events, statusFilter]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}>
        <View style={[styles.card, styles.headerCard, isMobile && styles.headerCardMobile]}>
          <Text style={[styles.title, isSmallMobile && styles.titleSmall]}>History</Text>
          <Text style={styles.subTitle}>Review past doses</Text>

          {/* Status filter */}
          <View style={[styles.filtersRow, isMobile && styles.filtersRowMobile]}>
            <View style={[styles.inputStub, isMobile && styles.inputStubMobile]}>
              <Text style={styles.stubLabel}>Status</Text>
              <View style={styles.filterChipRow}>
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterChip,
                      statusFilter === option.value && styles.filterChipActive,
                    ]}
                    onPress={() => setStatusFilter(option.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        statusFilter === option.value && styles.filterChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {orderedHistory.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No history found.</Text>
            <Text style={styles.emptyStateSubtext}>Events will appear here once doses are recorded.</Text>
          </View>
        )}

        {orderedHistory.map((day) => (
          <View key={day.date} style={styles.daySection}>
            <Text style={[styles.dayLabel, isSmallMobile && styles.dayLabelSmall]}>
              {DateTime.fromISO(day.date).toFormat('ccc, MMM dd')}
            </Text>
            {day.entries.map((entry) => {
              const statusColors: Record<string, { bg: string; text: string }> = {
                TAKEN: { bg: 'rgba(74, 222, 128, 0.15)', text: '#4ade80' },
                PENDING: { bg: 'rgba(251, 191, 36, 0.15)', text: '#facc15' },
                MISSED: { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171' },
                FAILED: { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171' },
                SKIPPED: { bg: 'rgba(161, 161, 170, 0.15)', text: '#a1a1aa' },
              };
              const statusStyle = statusColors[entry.status] || statusColors.PENDING;
              const statusLabel =
                entry.status === 'TAKEN' ? 'Taken' :
                entry.status === 'PENDING' ? 'Pending' :
                entry.status === 'MISSED' ? 'Missed' :
                entry.status === 'SKIPPED' ? 'Skipped' : 'Failed';

              return (
                <View
                  key={entry.id}
                  style={[styles.entryCard, isMobile && styles.entryCardMobile]}
                >
                  <View style={styles.entryHeader}>
                    <View style={styles.entryTitleRow}>
                      <Text style={[styles.entryName, isSmallMobile && styles.entryNameSmall]}>
                        Dose
                      </Text>
                      <Text
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusStyle.bg, color: statusStyle.text },
                        ]}
                      >
                        {statusLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.entryMeta, isMobile && styles.entryMetaMobile]}>
                    <Text style={[styles.metaLabel, isSmallMobile && styles.metaLabelSmall]}>
                      Scheduled:{' '}
                      <Text style={styles.metaValue}>
                        {DateTime.fromISO(entry.dueAtISO).toFormat('h:mm a')}
                      </Text>
                    </Text>
                    <Text style={[styles.metaLabel, isSmallMobile && styles.metaLabelSmall]}>
                      Acted:{' '}
                      <Text style={styles.metaValue}>
                        {entry.actedAtISO
                          ? DateTime.fromISO(entry.actedAtISO).toFormat('h:mm a')
                          : '--'}
                      </Text>
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
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
  headerCard: { gap: 16 },
  headerCardMobile: { padding: 20, gap: 12 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  titleSmall: { fontSize: 22 },
  subTitle: { color: colors.textSecondary },
  filtersRow: { flexDirection: 'row', gap: 12 },
  filtersRowMobile: { flexDirection: 'column', gap: 10 },
  inputStub: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputStubMobile: { flex: undefined, width: '100%' },
  stubLabel: { color: colors.textSecondary, fontSize: 12 },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.surfaceAlt,
  },
  filterChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.accent,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  daySection: { gap: 12 },
  dayLabel: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
  dayLabelSmall: { fontSize: 16 },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  entryCardMobile: { padding: 14, borderRadius: 16, gap: 6 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  entryName: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  entryNameSmall: { fontSize: 14 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '600',
    overflow: 'hidden',
  },
  entryMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  entryMetaMobile: { flexDirection: 'column', gap: 4 },
  metaLabel: { color: colors.textSecondary, fontSize: 13 },
  metaLabelSmall: { fontSize: 12 },
  metaValue: { color: colors.textPrimary, fontWeight: '600' },
});
