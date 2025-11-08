import React from 'react';
import { View, Text, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LargeButton } from '@components/LargeButton';
import { PillChip } from '@components/PillChip';
import { usePillStore } from '@store/pillStore';
import type { DosePill } from '@types';

interface DispenseAlertScreenProps {
  visible: boolean;
  onClose: () => void;
  items: DosePill[];
  groupLabel: string;
  onDispense: () => void;
  onSnooze: () => void;
  onSkip: () => void;
}

export const DispenseAlertScreen: React.FC<DispenseAlertScreenProps> = ({
  visible,
  onClose,
  items,
  groupLabel,
  onDispense,
  onSnooze,
  onSkip,
}) => {
  const { getPillById } = usePillStore();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 px-6 py-8 justify-center">
          <Text className="text-3xl font-bold text-center mb-4" accessibilityRole="header">
            Time to Take Your Medication
          </Text>

          <Text className="text-lg text-gray-600 text-center mb-8">
            It's time for your scheduled dose
          </Text>

          <View className="bg-blue-50 rounded-2xl p-6 mb-8">
            <Text className="text-sm text-gray-600 mb-3 text-center">Your medications:</Text>
            <View className="flex-row flex-wrap justify-center">
              {items.map((item, index) => {
                const pill = getPillById(item.pillId);
                return pill ? (
                  <View key={index} className="m-1">
                    <PillChip pill={pill} quantity={item.qty} size="lg" />
                  </View>
                ) : null;
              })}
            </View>
          </View>

          <View className="space-y-3">
            <LargeButton
              title="Dispense Now"
              onPress={onDispense}
              variant="primary"
              accessibilityLabel="Dispense medication now"
            />

            <LargeButton
              title="Snooze for 10 min"
              onPress={onSnooze}
              variant="secondary"
              accessibilityLabel="Snooze for 10 minutes"
            />

            <LargeButton
              title="Skip This Dose"
              onPress={onSkip}
              variant="secondary"
              accessibilityLabel="Skip this dose"
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

