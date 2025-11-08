import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Settings } from '@types';

interface SettingsStore extends Settings {
  // Actions
  updateSettings: (updates: Partial<Settings>) => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  timeZone: 'America/New_York',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  caregiverEmail: undefined,
  pinEnabled: false,
  pinCode: undefined,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,

      updateSettings: (updates) => {
        set((state) => ({ ...state, ...updates }));
      },

      resetSettings: () => {
        set(defaultSettings);
      },
    }),
    {
      name: 'pillbox-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

