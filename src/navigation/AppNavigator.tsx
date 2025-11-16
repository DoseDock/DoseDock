import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import HomeIcon from '../../assets/icons/Home.svg';
import CalendarIcon from '../../assets/icons/Calendar.svg';
import GraphIcon from '../../assets/icons/Graph.svg';
import HardwareIcon from '../../assets/icons/Hardware.svg';
import SettingsIcon from '../../assets/icons/Settings.svg';

import { TodayScreen } from '@screens/TodayScreen';
import { ScheduleScreen } from '@screens/ScheduleScreen';
import { HistoryScreen } from '@screens/HistoryScreen';
import { SettingsScreen } from '@screens/SettingsScreen';
import { ScheduleWizardScreen } from '@screens/ScheduleWizardScreen';
import { HardwareMappingScreen } from '@screens/HardwareMappingScreen';
import { colors } from '@theme/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabIconMap: Record<string, React.FC<SvgProps>> = {
  Today: HomeIcon,
  Schedule: CalendarIcon,
  History: GraphIcon,
  Hardware: HardwareIcon,
  Settings: SettingsIcon,
};

const TabIcon: React.FC<{ label: string; focused: boolean }> = ({ label, focused }) => {
  const IconComponent = tabIconMap[label];
  return (
    <View style={{ alignItems: 'center', opacity: focused ? 1 : 0.5 }}>
      {IconComponent ? (
        <IconComponent width={26} height={26} />
      ) : (
        <Text style={{ fontSize: 24 }}>•</Text>
      )}
    </View>
  );
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          paddingBottom: 6,
          paddingTop: 6,
          height: 68,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Hardware" component={HardwareMappingScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer
      theme={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.background,
          card: colors.surface,
          border: colors.border,
          text: colors.textPrimary,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen
          name="ScheduleWizard"
          component={ScheduleWizardScreen}
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
