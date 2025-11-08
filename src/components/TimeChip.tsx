import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface TimeChipProps {
  time: string;
  onPress?: () => void;
  onRemove?: () => void;
  selected?: boolean;
}

export const TimeChip: React.FC<TimeChipProps> = ({ time, onPress, onRemove, selected = false }) => {
  const chipContent = (
    <>
      <Text className={`font-medium ${selected ? 'text-white' : 'text-gray-800'}`}>{time}</Text>
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          className="ml-2"
          accessibilityLabel={`Remove time ${time}`}
          accessibilityRole="button"
        >
          <Text className={`font-bold ${selected ? 'text-white' : 'text-gray-600'}`}>×</Text>
        </TouchableOpacity>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        className={`flex-row items-center rounded-full px-4 py-2 mr-2 mb-2 ${
          selected ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        accessibilityLabel={`Time ${time}${selected ? ', selected' : ''}`}
        accessibilityRole="button"
      >
        {chipContent}
      </TouchableOpacity>
    );
  }

  return (
    <View
      className={`flex-row items-center rounded-full px-4 py-2 mr-2 mb-2 ${
        selected ? 'bg-blue-600' : 'bg-gray-200'
      }`}
      accessibilityLabel={`Time ${time}${selected ? ', selected' : ''}`}
    >
      {chipContent}
    </View>
  );
};

