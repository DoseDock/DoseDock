import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Settings {
  timeZone: string;
}

interface SettingsStore extends Settings {
  updateSettings: (updates: Partial<Settings>) => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  timeZone: 'America/New_York',
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
