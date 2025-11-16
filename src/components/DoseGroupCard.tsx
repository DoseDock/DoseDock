import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { DateTime } from 'luxon';
import type { TodayCard } from '@types';
import { EventStatus } from '@types';
import { PillChip } from './PillChip';
import { usePillStore } from '@store/pillStore';

interface DoseGroupCardProps {
  card: TodayCard;
  onDispense?: () => void;
  onSnooze?: () => void;
  onSkip?: () => void;
  isLocked?: boolean;
}

export const DoseGroupCard: React.FC<DoseGroupCardProps> = ({
  card,
  onDispense,
  onSnooze,
  onSkip,
  isLocked = false,
}) => {
  const { getPillById } = usePillStore();
  const dueTime = DateTime.fromISO(card.dueAtISO);
  const isPending = card.status === EventStatus.PENDING;
  const isTaken = card.status === EventStatus.TAKEN;
  const isSkipped = card.status === EventStatus.SKIPPED;
  const isFailed = card.status === EventStatus.FAILED;

  const getStatusColor = () => {
    switch (card.status) {
      case EventStatus.TAKEN:
        return 'bg-green-50 border-green-200';
      case EventStatus.SKIPPED:
        return 'bg-gray-50 border-gray-200';
      case EventStatus.FAILED:
        return 'bg-amber-50 border-amber-300';
      case EventStatus.MISSED:
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-white border-blue-200';
    }
  };

  const getStatusText = () => {
    switch (card.status) {
      case EventStatus.TAKEN:
        return '✓ Taken';
      case EventStatus.SKIPPED:
        return 'Skipped';
      case EventStatus.FAILED:
        return '⚠️ Failed';
      case EventStatus.MISSED:
        return '✗ Missed';
      default:
        return dueTime.toFormat('h:mm a');
    }
  };

  return (
    <View
      className={`rounded-lg p-4 mb-3 border-2 ${getStatusColor()}`}
      accessibilityLabel={`${card.groupLabel} at ${dueTime.toFormat('h:mm a')}, status: ${card.status}`}
    >
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-bold">{getStatusText()}</Text>
        {card.snoozeCount > 0 && (
          <Text className="text-xs text-gray-600">
            Snoozed {card.snoozeCount}/{card.maxSnoozes}
          </Text>
        )}
      </View>

      <View className="flex-row flex-wrap mb-3">
        {card.items.map((item, index) => {
          const pill = getPillById(item.pillId);
          return pill ? (
            <View key={index} className="mr-2 mb-2">
              <PillChip pill={pill} quantity={item.qty} />
            </View>
          ) : null;
        })}
      </View>

      {isPending && !isLocked && (
        <View className="flex-row space-x-2">
          <TouchableOpacity
            onPress={onDispense}
            className="flex-1 bg-blue-600 rounded-lg py-3 px-4"
            accessibilityLabel="Dispense now"
            accessibilityRole="button"
          >
            <Text className="text-white text-center font-semibold">Dispense</Text>
          </TouchableOpacity>

          {card.snoozeCount < card.maxSnoozes && (
            <TouchableOpacity
              onPress={onSnooze}
              className="bg-gray-200 rounded-lg py-3 px-4"
              accessibilityLabel="Snooze for 10 minutes"
              accessibilityRole="button"
            >
              <Text className="text-gray-700 text-center font-medium">Snooze</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onSkip}
            className="bg-gray-200 rounded-lg py-3 px-4"
            accessibilityLabel="Skip this dose"
            accessibilityRole="button"
          >
            <Text className="text-gray-700 text-center font-medium">Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {isPending && isLocked && (
        <View className="bg-gray-100 rounded-lg py-3 px-4">
          <Text className="text-gray-600 text-center text-sm">
            🔒 Lockout active until {DateTime.fromISO(card.lockoutUntilISO!).toFormat('h:mm a')}
          </Text>
        </View>
      )}

      {isFailed && (
        <TouchableOpacity
          onPress={onDispense}
          className="bg-amber-600 rounded-lg py-3 px-4"
          accessibilityLabel="Retry dispense"
          accessibilityRole="button"
        >
          <Text className="text-white text-center font-semibold">Retry</Text>
        </TouchableOpacity>
      )}

      {(isTaken || isSkipped) && (
        <View className="pt-2 border-t border-gray-200">
          <Text className="text-xs text-gray-500">
            {card.status === EventStatus.TAKEN ? 'Dispensed' : 'Skipped'} at{' '}
            {DateTime.now().toFormat('h:mm a')}
          </Text>
        </View>
      )}
    </View>
  );
};



