import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { DateTime } from 'luxon';
import type { TodayCard, EventStatus } from '@types';
import { PillChip } from './PillChip';
import { usePillStore } from '@store/pillStore';

interface DoseGroupCardProps {
  card: TodayCard;
  onDispense?: () => void;
  onSkip?: () => void;
  isLocked?: boolean;
}

export const DoseGroupCard: React.FC<DoseGroupCardProps> = ({
  card,
  onDispense,
  onSkip,
  isLocked = false,
}) => {
  const { getPillById } = usePillStore();
  const isPending = card.status === ('PENDING' as EventStatus);
  const isTaken = card.status === ('TAKEN' as EventStatus);
  const isSkipped = card.status === ('SKIPPED' as EventStatus);
  const isFailed = card.status === ('FAILED' as EventStatus);

  const getStatusColor = () => {
    switch (card.status as string) {
      case 'TAKEN':
        return 'bg-green-50 border-green-200';
      case 'SKIPPED':
        return 'bg-gray-50 border-gray-200';
      case 'FAILED':
        return 'bg-amber-50 border-amber-300';
      case 'MISSED':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-white border-blue-200';
    }
  };

  const getStatusText = () => {
    switch (card.status as string) {
      case 'TAKEN':
        return 'Taken';
      case 'SKIPPED':
        return 'Skipped';
      case 'FAILED':
        return 'Failed';
      case 'MISSED':
        return 'Missed';
      default:
        return card.time;
    }
  };

  return (
    <View
      className={`rounded-lg p-4 mb-3 border-2 ${getStatusColor()}`}
      accessibilityLabel={`${card.groupLabel} at ${card.time}, status: ${card.status}`}
    >
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-bold">{getStatusText()}</Text>
      </View>

      <View className="flex-row flex-wrap mb-3">
        {card.pills.map((pill, index) => (
          <View key={index} className="mr-2 mb-2">
            <PillChip pill={pill} quantity={1} />
          </View>
        ))}
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
            Lockout active
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
            {card.status === 'TAKEN' ? 'Dispensed' : 'Skipped'} at{' '}
            {DateTime.now().toFormat('h:mm a')}
          </Text>
        </View>
      )}
    </View>
  );
};
