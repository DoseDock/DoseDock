import React from 'react';
import { View, Text } from 'react-native';
import type { Pill } from '@types';

interface PillChipProps {
  pill: Pill;
  quantity?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const PillChip: React.FC<PillChipProps> = ({ pill, quantity, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-1',
    md: 'px-3 py-1.5',
    lg: 'px-4 py-2',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <View
      className={`flex-row items-center rounded-full ${sizeClasses[size]}`}
      style={{ backgroundColor: pill.color + '20', borderColor: pill.color, borderWidth: 1 }}
      accessibilityLabel={`${quantity ? quantity + ' ' : ''}${pill.name} pill${quantity && quantity > 1 ? 's' : ''}`}
    >
      <View
        className="w-3 h-3 rounded-full mr-2"
        style={{ backgroundColor: pill.color }}
        accessibilityLabel={`${pill.color} pill`}
      />
      {quantity && <Text className={`font-semibold mr-1 ${textSizeClasses[size]}`}>{quantity}×</Text>}
      <Text className={`font-medium ${textSizeClasses[size]}`}>{pill.name}</Text>
    </View>
  );
};



