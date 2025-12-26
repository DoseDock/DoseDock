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
import { eventLogRepository } from '@data/repositories/EventLogRepository';
import { usePillStore } from '@store/pillStore';
import type { EventLog } from '@types';
import { EventStatus } from '@types';

const presets = [
  { label: '3 days', days: 3 },
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
];

const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Taken', value: EventStatus.TAKEN },
  { label: 'Missed', value: EventStatus.MISSED },
  { label: 'Pending', value: EventStatus.PENDING },
  { label: 'Skipped', value: EventStatus.SKIPPED },
];

export const HistoryScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const isSmallMobile = width < 400;
  const { pills, loadPills } = usePillStore();
  const [range, setRange] = useState(() => ({
    start: DateTime.now().minus({ days: 3 }).startOf('day'),
    end: DateTime.now().endOf('day'),
  }));
  const [historyMap, setHistoryMap] = useState<Record<string, EventLog[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [startInput, setStartInput] = useState(range.start.toISODate());
  const [endInput, setEndInput] = useState(range.end.toISODate());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [medicationFilter, setMedicationFilter] = useState<string>('all');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const pillOptions = useMemo(() => {
    const options = [{ label: 'All Medications', value: 'all' }];
    pills.forEach((pill) => {
      options.push({ label: pill.name, value: pill.id });
    });
    return options;
  }, [pills]);

  const refreshHistory = useCallback(async () => {
    setIsLoading(true);
    await loadPills();
    const events = await eventLogRepository.getByDateRange(
      range.start.toISO()!,
      range.end.toISO()!
    );
    const grouped: Record<string, EventLog[]> = {};
    events.forEach((event) => {
      const day = DateTime.fromISO(event.dueAtISO).toISODate();
      if (!day) return;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(event);
    });
    setHistoryMap(grouped);
    setIsLoading(false);
  }, [loadPills, range.end, range.start]);

  useEffect(() => {
    setStartInput(range.start.toISODate());
    setEndInput(range.end.toISODate());
  }, [range.start, range.end]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const orderedHistory = useMemo(() => {
    return Object.entries(historyMap)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, entries]) => {
        let filtered = entries;

        // Apply status filter
        if (statusFilter !== 'all') {
          filtered = filtered.filter((entry) => entry.status === statusFilter);
        }

        // Apply medication filter
        if (medicationFilter !== 'all') {
          filtered = filtered.filter((entry) => {
            try {
              const parsed = JSON.parse(entry.detailsJSON);
              if (parsed.items?.length) {
                return parsed.items.some((item: { pillId: string }) => item.pillId === medicationFilter);
              }
            } catch {
              // ignore
            }
            return false;
          });
        }

        return { date, entries: filtered };
      })
      .filter((day) => day.entries.length > 0); // Remove empty days
  }, [historyMap, statusFilter, medicationFilter]);

  const updatePreset = (days: number) => {
    setRange({
      start: DateTime.now().minus({ days }).startOf('day'),
      end: DateTime.now().endOf('day'),
    });
  };

  const handleSearch = () => {
    if (applyInputsToRange()) {
      refreshHistory();
    }
  };

  const applyInputsToRange = (override?: { start?: string; end?: string }) => {
    const startValue = override?.start ?? startInput;
    const endValue = override?.end ?? endInput;
    const nextStart = DateTime.fromISO(startValue || '');
    const nextEnd = DateTime.fromISO(endValue || '');
    if (!nextStart.isValid || !nextEnd.isValid) {
      Alert.alert('Invalid date', 'Please use YYYY-MM-DD format for start and end.');
      return false;
    }
    setRange({
      start: nextStart.startOf('day'),
      end: nextEnd.endOf('day'),
    });
    return true;
  };

  const renderDetail = (entry: EventLog, key: 'providerNotes' | 'additionalNotes') => {
    try {
      const parsed = JSON.parse(entry.detailsJSON);
      return parsed[key] || 'N/A';
    } catch {
      return 'N/A';
    }
  };

  const tabletsDispensed = (entry: EventLog) => {
    try {
      const parsed = JSON.parse(entry.detailsJSON);
      if (!parsed.items?.length) return 'N/A';
      const total = parsed.items.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
      return total || 'N/A';
    } catch {
      return 'N/A';
    }
  };

  const labelFromEntry = (entry: EventLog) => {
    try {
      const parsed = JSON.parse(entry.detailsJSON);
      if (parsed.items?.length) {
        return parsed.items.map((item: any) => pills.get(item.pillId)?.name || 'Dose').join(', ');
      }
    } catch {
      // ignore
    }
    return entry.groupLabel;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}>
        <View style={[styles.card, styles.headerCard, isMobile && styles.headerCardMobile]}>
          <Text style={[styles.title, isSmallMobile && styles.titleSmall]}>History</Text>
          <Text style={styles.subTitle}>Filter by date & time</Text>
          <View style={[styles.filtersRow, isMobile && styles.filtersRowMobile]}>
            <View style={[styles.inputStub, isMobile && styles.inputStubMobile]}>
              <Text style={styles.stubLabel}>Date Start</Text>
              <TextInput
                style={[styles.input, isSmallMobile && styles.inputSmall]}
                value={startInput || ''}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                onChangeText={(value) => setStartInput(value)}
                onBlur={() => {
                  const parsed = DateTime.fromISO(startInput || '');
                  if (parsed.isValid) {
                    setRange((prev) => ({
                      ...prev,
                      start: parsed.startOf('day'),
                    }));
                  }
                }}
              />
            </View>
            <View style={[styles.inputStub, isMobile && styles.inputStubMobile]}>
              <Text style={styles.stubLabel}>Date End</Text>
              <TextInput
                style={[styles.input, isSmallMobile && styles.inputSmall]}
                value={endInput || ''}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                onChangeText={(value) => setEndInput(value)}
                onBlur={() => {
                  const parsed = DateTime.fromISO(endInput || '');
                  if (parsed.isValid) {
                    setRange((prev) => ({
                      ...prev,
                      end: parsed.endOf('day'),
                    }));
                  }
                }}
              />
            </View>
            {!isMobile && (
              <View style={styles.inputStub}>
                <Text style={styles.stubLabel}>Timezone</Text>
                <Text style={styles.stubValue}>{DateTime.now().zoneName}</Text>
              </View>
            )}
          </View>
          <View style={[styles.filtersRow, isMobile && styles.filtersRowMobile]}>
            <View style={[styles.inputStub, styles.filterWide, isMobile && styles.filterWideMobile]}>
              <Text style={styles.stubLabel}>Quick range</Text>
              <View style={styles.presetRow}>
                {presets.map((preset) => (
                  <TouchableOpacity
                    key={preset.label}
                    style={[styles.presetChip, isSmallMobile && styles.presetChipSmall]}
                    onPress={() => updatePreset(preset.days)}
                  >
                    <Text style={[styles.presetText, isSmallMobile && styles.presetTextSmall]}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={[styles.searchButton, shadows.card, isMobile && styles.searchButtonMobile]} onPress={handleSearch}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.searchText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Filters Row */}
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
            <View style={[styles.inputStub, isMobile && styles.inputStubMobile]}>
              <Text style={styles.stubLabel}>Medication</Text>
              <View style={styles.filterChipRow}>
                {pillOptions.slice(0, 4).map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterChip,
                      medicationFilter === option.value && styles.filterChipActive,
                    ]}
                    onPress={() => setMedicationFilter(option.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        medicationFilter === option.value && styles.filterChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                {pillOptions.length > 4 && (
                  <Text style={styles.moreText}>+{pillOptions.length - 4}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {orderedHistory.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No history found for the selected filters.</Text>
            <Text style={styles.emptyStateSubtext}>Try adjusting your date range or filters.</Text>
          </View>
        )}

        {orderedHistory.map((day) => (
          <View key={day.date} style={styles.daySection}>
            <Text style={[styles.dayLabel, isSmallMobile && styles.dayLabelSmall]}>
              {DateTime.fromISO(day.date, { zone: 'utc' })
                .setZone(DateTime.now().zoneName)
                .toFormat('ccc, MMM dd')}
            </Text>
            {day.entries.map((entry) => {
              const isExpanded = expandedEntries.has(entry.id);
              const statusColors: Record<string, { bg: string; text: string }> = {
                [EventStatus.TAKEN]: { bg: 'rgba(74, 222, 128, 0.15)', text: '#4ade80' },
                [EventStatus.PENDING]: { bg: 'rgba(251, 191, 36, 0.15)', text: '#facc15' },
                [EventStatus.MISSED]: { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171' },
                [EventStatus.FAILED]: { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171' },
                [EventStatus.SKIPPED]: { bg: 'rgba(161, 161, 170, 0.15)', text: '#a1a1aa' },
                [EventStatus.SNOOZED]: { bg: 'rgba(251, 191, 36, 0.15)', text: '#facc15' },
              };
              const statusStyle = statusColors[entry.status] || statusColors[EventStatus.PENDING];

              return (
                <TouchableOpacity
                  key={entry.id}
                  style={[styles.entryCard, isMobile && styles.entryCardMobile]}
                  onPress={() => toggleExpanded(entry.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.entryHeader}>
                    <View style={styles.entryTitleRow}>
                      <Text style={[styles.entryName, isSmallMobile && styles.entryNameSmall]}>
                        {labelFromEntry(entry)}
                      </Text>
                      <Text
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusStyle.bg, color: statusStyle.text },
                        ]}
                      >
                        {entry.status === EventStatus.TAKEN ? 'Taken' :
                         entry.status === EventStatus.PENDING ? 'Pending' :
                         entry.status === EventStatus.MISSED ? 'Missed' :
                         entry.status === EventStatus.SNOOZED ? 'Snoozed' :
                         entry.status === EventStatus.SKIPPED ? 'Skipped' : 'Failed'}
                      </Text>
                    </View>
                    <Text style={[styles.chevron, isExpanded && styles.chevronExpanded]}>⌃</Text>
                  </View>

                  <View style={[styles.entryMeta, isMobile && styles.entryMetaMobile]}>
                    <Text style={[styles.metaLabel, isSmallMobile && styles.metaLabelSmall]}>
                      Scheduled:{' '}
                      <Text style={styles.metaValue}>
                        {DateTime.fromISO(entry.dueAtISO).toFormat('h:mm a')}
                      </Text>
                    </Text>
                    <Text style={[styles.metaLabel, isSmallMobile && styles.metaLabelSmall]}>
                      Taken:{' '}
                      <Text style={styles.metaValue}>
                        {entry.actedAtISO
                          ? DateTime.fromISO(entry.actedAtISO).toFormat('h:mm a')
                          : '—'}
                      </Text>
                    </Text>
                  </View>

                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <View style={styles.divider} />
                      <Text style={styles.metaLabel}>
                        Tablets Dispensed: <Text style={styles.metaValue}>{tabletsDispensed(entry)}</Text>
                      </Text>
                      <Text style={styles.metaLabel}>
                        Provider Notes:{' '}
                        <Text style={styles.metaValue}>{renderDetail(entry, 'providerNotes')}</Text>
                      </Text>
                      <Text style={styles.metaLabel}>
                        Additional Notes:{' '}
                        <Text style={styles.metaValue}>{renderDetail(entry, 'additionalNotes')}</Text>
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
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
  headerCardMobile: { padding: 16, borderRadius: 20, gap: 12 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  titleSmall: { fontSize: 24 },
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
    marginTop: 6,
  },
  inputSmall: { paddingVertical: 6, fontSize: 14 },
  stubLabel: { color: colors.textSecondary, fontSize: 12 },
  stubValue: { color: colors.textPrimary, fontSize: 16, marginTop: 4 },
  filterWide: { flex: 2 },
  filterWideMobile: { flex: undefined, width: '100%' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  presetChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetChipSmall: { paddingHorizontal: 10, paddingVertical: 5 },
  presetText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  presetTextSmall: { fontSize: 11 },
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
  moreText: {
    color: colors.textSecondary,
    fontSize: 11,
    alignSelf: 'center',
    marginLeft: 4,
  },
  searchButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonMobile: { width: '100%', paddingVertical: 12 },
  searchText: { color: '#fff', fontWeight: '600' },
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
  chevron: {
    color: colors.textSecondary,
    fontSize: 16,
    transform: [{ rotate: '180deg' }],
    marginLeft: 8,
  },
  chevronExpanded: {
    transform: [{ rotate: '0deg' }],
  },
  entryMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  entryMetaMobile: { flexDirection: 'column', gap: 4 },
  expandedContent: {
    gap: 6,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  metaLabel: { color: colors.textSecondary, fontSize: 13 },
  metaLabelSmall: { fontSize: 12 },
  metaValue: { color: colors.textPrimary, fontWeight: '600' },
});
