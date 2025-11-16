import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { Pill } from '@types';

interface PillCardProps {
  pill: Pill;
  onPress?: () => void;
}

export const PillCard: React.FC<PillCardProps> = ({ pill, onPress }) => {
  const isLowStock = pill.stockCount <= pill.lowStockThreshold;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200"
      accessibilityLabel={`${pill.name} pill, ${pill.stockCount} pills in stock${isLowStock ? ', low stock' : ''}`}
      accessibilityRole="button"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <View
              className="w-8 h-8 rounded-full mr-3"
              style={{ backgroundColor: pill.color }}
              accessibilityLabel={`${pill.color} ${pill.shape} pill`}
            />
            <View className="flex-1">
              <Text className="text-lg font-semibold">{pill.name}</Text>
              <Text className="text-sm text-gray-600">Cartridge {pill.cartridgeIndex}</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between mt-2">
            <View>
              <Text className={`text-sm ${isLowStock ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                {pill.stockCount} pills
              </Text>
              {isLowStock && (
                <Text className="text-xs text-red-600 mt-1">⚠️ Low stock</Text>
              )}
            </View>
            <View>
              <Text className="text-xs text-gray-500">Max daily: {pill.maxDailyDose}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};



