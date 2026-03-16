import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '@theme/colors';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface TimePickerProps {
  value: string; // "HH:MM" format
  onChange: (time: string) => void;
}

const hours = Array.from({ length: 12 }, (_, i) => i + 1);
const minutes = Array.from({ length: 60 }, (_, i) => i);
const periods = ['AM', 'PM'] as const;

const padZero = (n: number) => n.toString().padStart(2, '0');

const WheelColumn: React.FC<{
  data: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width?: number;
}> = ({ data, selectedIndex, onSelect, width = 60 }) => {
  const scrollRef = useRef<ScrollView>(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    if (!isScrollingRef.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, [selectedIndex]);

  const handleScrollEnd = useCallback(
    (event: any) => {
      isScrollingRef.current = false;
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
      if (clampedIndex !== selectedIndex) {
        onSelect(clampedIndex);
      }
      // Snap to position
      scrollRef.current?.scrollTo({
        y: clampedIndex * ITEM_HEIGHT,
        animated: true,
      });
    },
    [data.length, selectedIndex, onSelect]
  );

  const handleScrollBegin = useCallback(() => {
    isScrollingRef.current = true;
  }, []);

  return (
    <View style={[styles.wheelContainer, { width }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={(e) => {
          // If no momentum, handle end here
          if (e.nativeEvent.velocity?.y === 0) {
            handleScrollEnd(e);
          }
        }}
        contentContainerStyle={styles.wheelContent}
      >
        {/* Top padding */}
        <View style={{ height: ITEM_HEIGHT }} />
        {data.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <View key={index} style={styles.wheelItem}>
              <Text
                style={[
                  styles.wheelItemText,
                  isSelected && styles.wheelItemTextSelected,
                ]}
              >
                {typeof item === 'number' ? padZero(item) : item}
              </Text>
            </View>
          );
        })}
        {/* Bottom padding */}
        <View style={{ height: ITEM_HEIGHT }} />
      </ScrollView>
      {/* Selection indicator */}
      <View style={styles.selectionIndicator} pointerEvents="none" />
    </View>
  );
};

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange }) => {
  const { width } = useWindowDimensions();
  const isSmall = width < 380;

  // Parse current value (24-hour format "HH:MM") to 12-hour display
  const parseTime = (timeStr: string) => {
    const [hourStr, minuteStr] = timeStr.split(':');
    let hour24 = parseInt(hourStr, 10) || 0;
    const minute = parseInt(minuteStr, 10) || 0;

    const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;

    return { hour12, minute, period };
  };

  const { hour12, minute, period } = parseTime(value);

  const hourIndex = hours.indexOf(hour12);
  const minuteIndex = minute;
  const periodIndex = periods.indexOf(period);

  const buildTimeString = (h12: number, min: number, p: 'AM' | 'PM') => {
    let h24 = h12;
    if (p === 'AM') {
      if (h12 === 12) h24 = 0;
    } else {
      if (h12 !== 12) h24 = h12 + 12;
    }
    return `${padZero(h24)}:${padZero(min)}`;
  };

  const handleHourChange = (index: number) => {
    onChange(buildTimeString(hours[index], minute, period));
  };

  const handleMinuteChange = (index: number) => {
    onChange(buildTimeString(hour12, index, period));
  };

  const handlePeriodChange = (index: number) => {
    onChange(buildTimeString(hour12, minute, periods[index]));
  };

  return (
    <View style={[styles.container, isSmall && styles.containerSmall]}>
      <WheelColumn
        data={hours}
        selectedIndex={hourIndex >= 0 ? hourIndex : 0}
        onSelect={handleHourChange}
        width={isSmall ? 50 : 60}
      />
      <Text style={styles.separator}>:</Text>
      <WheelColumn
        data={minutes}
        selectedIndex={minuteIndex}
        onSelect={handleMinuteChange}
        width={isSmall ? 50 : 60}
      />
      <WheelColumn
        data={periods as unknown as string[]}
        selectedIndex={periodIndex >= 0 ? periodIndex : 0}
        onSelect={handlePeriodChange}
        width={isSmall ? 50 : 60}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  containerSmall: {
    paddingHorizontal: 4,
  },
  wheelContainer: {
    height: PICKER_HEIGHT,
    overflow: 'hidden',
  },
  wheelContent: {
    alignItems: 'center',
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  wheelItemTextSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  selectionIndicator: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  separator: {
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: '600',
    marginHorizontal: 2,
  },
});
