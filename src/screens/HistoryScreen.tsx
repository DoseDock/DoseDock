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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadows } from '@theme/colors';
import { DateTime } from 'luxon';
import { eventLogRepository } from '@data/repositories/EventLogRepository';
import { usePillStore } from '@store/pillStore';
import type { EventLog } from '@types';

const presets = [
  { label: '3 days', days: 3 },
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
];

export const HistoryScreen: React.FC = () => {
  const { pills, loadPills } = usePillStore();
  const [range, setRange] = useState(() => ({
    start: DateTime.now().minus({ days: 3 }).startOf('day'),
    end: DateTime.now().endOf('day'),
  }));
  const [historyMap, setHistoryMap] = useState<Record<string, EventLog[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [startInput, setStartInput] = useState(range.start.toISODate());
  const [endInput, setEndInput] = useState(range.end.toISODate());

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
      .map(([date, entries]) => ({ date, entries }));
  }, [historyMap]);

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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, styles.headerCard]}>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subTitle}>Filter by date & time</Text>
          <View style={styles.filtersRow}>
            <View style={styles.inputStub}>
              <Text style={styles.stubLabel}>Date Start</Text>
              <TextInput
                style={styles.input}
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
            <View style={styles.inputStub}>
              <Text style={styles.stubLabel}>Date End</Text>
              <TextInput
                style={styles.input}
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
            <View style={styles.inputStub}>
              <Text style={styles.stubLabel}>Timezone</Text>
              <Text style={styles.stubValue}>{DateTime.now().zoneName}</Text>
            </View>
          </View>
          <View style={styles.filtersRow}>
            <View style={[styles.inputStub, styles.filterWide]}>
              <Text style={styles.stubLabel}>Quick range</Text>
              <View style={styles.presetRow}>
                {presets.map((preset) => (
                  <TouchableOpacity
                    key={preset.label}
                    style={styles.presetChip}
                    onPress={() => updatePreset(preset.days)}
                  >
                    <Text style={styles.presetText}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={[styles.searchButton, shadows.card]} onPress={handleSearch}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.searchText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {orderedHistory.map((day) => (
          <View key={day.date} style={styles.daySection}>
            <Text style={styles.dayLabel}>
              {DateTime.fromISO(day.date, { zone: 'utc' })
                .setZone(DateTime.now().zoneName)
                .toFormat('ccc, MMM dd')}
            </Text>
            {day.entries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryName}>{labelFromEntry(entry)}</Text>
                  <Text style={styles.chevron}>⌃</Text>
                </View>
                <View style={styles.entryMeta}>
                  <Text style={styles.metaLabel}>
                    Time Dispensed:{' '}
                    <Text style={styles.metaValue}>
                      {DateTime.fromISO(entry.dueAtISO).toFormat('h:mm a')}
                    </Text>
                  </Text>
                  <Text style={styles.metaLabel}>
                    Time Taken:{' '}
                    <Text style={styles.metaValue}>
                      {entry.actedAtISO
                        ? DateTime.fromISO(entry.actedAtISO).toFormat('h:mm a')
                        : 'Not recorded'}
                    </Text>
                  </Text>
                </View>
                <Text style={styles.metaLabel}>
                  Tablets Dispensed: <Text style={styles.metaValue}>{tabletsDispensed(entry)}</Text>
                </Text>
                <Text style={styles.metaLabel}>
                  Provider Notes: <Text style={styles.metaValue}>{renderDetail(entry, 'providerNotes')}</Text>
                </Text>
                <Text style={styles.metaLabel}>
                  Additional Notes:{' '}
                  <Text style={styles.metaValue}>{renderDetail(entry, 'additionalNotes')}</Text>
                </Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingVertical: 24, gap: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    ...shadows.card,
  },
  headerCard: { gap: 16 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  subTitle: { color: colors.textSecondary },
  filtersRow: { flexDirection: 'row', gap: 12 },
  inputStub: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
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
  stubLabel: { color: colors.textSecondary, fontSize: 12 },
  stubValue: { color: colors.textPrimary, fontSize: 16, marginTop: 4 },
  filterWide: { flex: 2 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  presetChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  searchButton: {
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchText: { color: '#fff', fontWeight: '600' },
  daySection: { gap: 12 },
  dayLabel: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryName: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  chevron: { color: colors.textSecondary },
  entryMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { color: colors.textSecondary, fontSize: 13 },
  metaValue: { color: colors.textPrimary, fontWeight: '600' },
});
