import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { ScheduleModal } from '@components/ScheduleModal';

interface ScheduleItem {
  id: string;
  title: string;
  date: string;
  time: string;
  notes: string;
}

export const ScheduleScreen: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [selectedDate, setSelectedDate] = useState('');

  // Convert schedules to marked dates format for the calendar
  const getMarkedDates = () => {
    const marked: any = {};
    
    schedules.forEach((schedule) => {
      if (!marked[schedule.date]) {
        marked[schedule.date] = {
          marked: true,
          dotColor: '#3b82f6',
          dots: [{ color: '#3b82f6' }],
        };
      }
    });

    // Also mark selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#3b82f6',
      };
    }

    return marked;
  };

  // Get schedules for selected date
  const getSchedulesForDate = (date: string) => {
    return schedules
      .filter((s) => s.date === date)
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const handleSaveSchedule = (schedule: {
    title: string;
    date: string;
    time: string;
    notes: string;
  }) => {
    const newSchedule: ScheduleItem = {
      id: Date.now().toString(),
      ...schedule,
    };
    setSchedules([...schedules, newSchedule]);
    setSelectedDate(schedule.date); // Auto-select the date
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules(schedules.filter((s) => s.id !== id));
  };

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };

  const todaySchedules = selectedDate ? getSchedulesForDate(selectedDate) : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Medication Schedule</Text>
        <Text style={styles.subtitle}>
          {schedules.length} scheduled dose{schedules.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Calendar */}
        <View style={styles.calendarCard}>
          <Calendar
            markedDates={getMarkedDates()}
            onDayPress={handleDayPress}
            theme={{
              todayTextColor: '#3b82f6',
              selectedDayBackgroundColor: '#3b82f6',
              selectedDayTextColor: '#ffffff',
              arrowColor: '#3b82f6',
              monthTextColor: '#1f2937',
              textMonthFontSize: 18,
              textMonthFontWeight: 'bold',
              textDayFontSize: 16,
              textDayHeaderFontSize: 14,
            }}
            style={styles.calendar}
          />
        </View>

        {/* Selected Date Schedules */}
        {selectedDate && (
          <View style={styles.selectedDateSection}>
            <Text style={styles.selectedDateTitle}>
              📅 {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>

            {todaySchedules.length > 0 ? (
              todaySchedules.map((schedule) => (
                <View key={schedule.id} style={styles.scheduleCard}>
                  <View style={styles.scheduleHeader}>
                    <View style={styles.timeBadge}>
                      <Text style={styles.timeText}>🕐 {schedule.time}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteSchedule(schedule.id)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.scheduleTitle}>💊 {schedule.title}</Text>
                  {schedule.notes ? (
                    <Text style={styles.scheduleNotes}>{schedule.notes}</Text>
                  ) : null}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No medications scheduled for this day</Text>
              </View>
            )}
          </View>
        )}

        {/* Empty state when no date selected */}
        {!selectedDate && schedules.length === 0 && (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyTitle}>📅 No Schedules Yet</Text>
            <Text style={styles.emptyDescription}>
              Tap the + button below to schedule your first medication!
            </Text>
          </View>
        )}

        {!selectedDate && schedules.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              👆 Tap a date on the calendar to view scheduled medications
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        accessibilityLabel="Add new schedule"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Schedule Modal */}
      <ScheduleModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveSchedule}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  calendarCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  calendar: {
    borderRadius: 12,
  },
  selectedDateSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  scheduleCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#dc2626',
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  scheduleNotes: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  emptyStateCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: 'white',
    fontWeight: 'bold',
  },
});
