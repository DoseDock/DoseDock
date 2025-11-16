import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: {
    label: string;
    onPress: () => void;
  };
  leftAction?: {
    label: string;
    onPress: () => void;
  };
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  rightAction,
  leftAction,
}) => {
  return (
    <View className="px-4 py-4 bg-white border-b border-gray-200">
      <View className="flex-row items-center justify-between">
        {leftAction ? (
          <TouchableOpacity
            onPress={leftAction.onPress}
            accessibilityLabel={leftAction.label}
            accessibilityRole="button"
          >
            <Text className="text-blue-600 text-base font-medium">{leftAction.label}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}

        <View className="flex-1 items-center">
          <Text className="text-xl font-bold text-gray-900" accessibilityRole="header">
            {title}
          </Text>
          {subtitle && <Text className="text-sm text-gray-600 mt-1">{subtitle}</Text>}
        </View>

        {rightAction ? (
          <TouchableOpacity
            onPress={rightAction.onPress}
            accessibilityLabel={rightAction.label}
            accessibilityRole="button"
          >
            <Text className="text-blue-600 text-base font-medium">{rightAction.label}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>
    </View>
  );
};



