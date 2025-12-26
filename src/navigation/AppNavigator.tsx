import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, useWindowDimensions } from 'react-native';
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
import { SignupScreen } from '@screens/SignupScreen';
import { useSessionStore } from '@store/sessionStore';
import { graphQLConfig } from '@/config/env';

const Tab = createBottomTabNavigator();
const AppStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

const tabIconMap: Record<string, React.FC<SvgProps>> = {
  Today: HomeIcon,
  Schedule: CalendarIcon,
  History: GraphIcon,
  Hardware: HardwareIcon,
  Settings: SettingsIcon,
};

const TabIcon: React.FC<{ label: string; focused: boolean; isSmall?: boolean }> = ({ label, focused, isSmall }) => {
  const IconComponent = tabIconMap[label];
  const size = isSmall ? 22 : 26;
  return (
    <View style={{ alignItems: 'center', opacity: focused ? 1 : 0.5 }}>
      {IconComponent ? (
        <IconComponent width={size} height={size} />
      ) : (
        <Text style={{ fontSize: isSmall ? 20 : 24 }}>•</Text>
      )}
    </View>
  );
};

function TabNavigator() {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} isSmall={isSmallScreen} />,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          paddingBottom: isSmallScreen ? 4 : 6,
          paddingTop: isSmallScreen ? 4 : 6,
          height: isSmallScreen ? 58 : 68,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: isSmallScreen ? 10 : 12,
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

function AuthedNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Main" component={TabNavigator} />
      <AppStack.Screen
        name="ScheduleWizard"
        component={ScheduleWizardScreen}
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </AppStack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

export function AppNavigator() {
  const sessionPatient = useSessionStore((state) => state.patient);
  const sessionUser = useSessionStore((state) => state.user);
  const [navKey, setNavKey] = React.useState(0);
  const hasRuntimePatient = Boolean(sessionPatient || graphQLConfig.patientId);

  // Force re-render when patient changes
  React.useEffect(() => {
    console.log('AppNavigator: sessionPatient =', sessionPatient);
    console.log('AppNavigator: sessionUser =', sessionUser);
    console.log('AppNavigator: graphQLConfig.patientId =', graphQLConfig.patientId);
    console.log('AppNavigator: hasRuntimePatient =', hasRuntimePatient);
    // Force navigation update by changing key
    setNavKey((prev) => prev + 1);
  }, [sessionPatient, sessionUser, hasRuntimePatient]);

  return (
    <NavigationContainer
      key={`nav-${navKey}-${hasRuntimePatient ? 'auth' : 'unauth'}`}
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
      {hasRuntimePatient ? <AuthedNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
