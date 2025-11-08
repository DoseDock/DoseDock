import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';

import { TodayScreen } from '@screens/TodayScreen';
import { ScheduleScreen } from '@screens/ScheduleScreen';
import { PillLibraryScreen } from '@screens/PillLibraryScreen';
import { HistoryScreen } from '@screens/HistoryScreen';
import { SettingsScreen } from '@screens/SettingsScreen';
import { ScheduleWizardScreen } from '@screens/ScheduleWizardScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabIcon: React.FC<{ label: string; focused: boolean }> = ({ label, focused }) => {
  const icons: Record<string, string> = {
    Today: '📅',
    Schedule: '🗓️',
    Library: '💊',
    History: '📊',
    Settings: '⚙️',
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>
        {icons[label] || '•'}
      </Text>
    </View>
  );
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Library" component={PillLibraryScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
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
