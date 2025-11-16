import { create } from 'zustand';
import type { PillHardwareProfile } from '@types';
import { pillHardwareRepository } from '@data/repositories/PillHardwareRepository';
import { api } from '../api/client';
import { SAMPLE_HARDWARE_PROFILES } from '@data/sampleData';

interface HardwareStore {
  profiles: Record<string, PillHardwareProfile>;
  isLoading: boolean;
  error?: string;

  loadProfiles: () => Promise<void>;
  getProfile: (pillId: string) => PillHardwareProfile | undefined;
  saveProfile: (profile: PillHardwareProfile) => Promise<void>;
  removeProfile: (pillId: string) => Promise<void>;
}

export const useHardwareStore = create<HardwareStore>((set, get) => ({
  profiles: {},
  isLoading: false,
  error: undefined,

  loadProfiles: async () => {
    set({ isLoading: true, error: undefined });
    try {
      try {
        const profiles = await api.get<PillHardwareProfile[]>('/hardware-profiles');
        const profileMap = profiles.reduce<Record<string, PillHardwareProfile>>((acc, profile) => {
          acc[profile.pillId] = profile;
          return acc;
        }, {});
        set({ profiles: profileMap, isLoading: false });
        return;
      } catch (networkError) {
        console.warn('Hardware store API unavailable, using SQLite/sample data.', networkError);
      }

      const profiles = await pillHardwareRepository.getAll();
      const source = profiles.length > 0 ? profiles : SAMPLE_HARDWARE_PROFILES;
      if (profiles.length === 0) {
        console.warn('Hardware store: no mappings found, using sample data.');
      }
      const profileMap = source.reduce<Record<string, PillHardwareProfile>>((acc, profile) => {
        acc[profile.pillId] = profile;
        return acc;
      }, {});
      set({ profiles: profileMap, isLoading: false });
    } catch (error) {
      console.error('Failed to load hardware profiles', error);
      const profileMap = SAMPLE_HARDWARE_PROFILES.reduce<Record<string, PillHardwareProfile>>(
        (acc, profile) => {
          acc[profile.pillId] = profile;
          return acc;
        },
        {}
      );
      set({
        profiles: profileMap,
        isLoading: false,
        error: 'Unable to load hardware mappings, using sample data.',
      });
    }
  },

  getProfile: (pillId: string) => {
    return get().profiles[pillId];
  },

  saveProfile: async (profile) => {
    try {
      try {
        await api.put(`/hardware-profiles/${profile.pillId}`, profile);
      } catch {
        await pillHardwareRepository.upsert(profile);
      }
      set((state) => ({
        profiles: {
          ...state.profiles,
          [profile.pillId]: profile,
        },
      }));
    } catch (error) {
      console.error('Failed to save hardware profile', error);
      throw error;
    }
  },

  removeProfile: async (pillId) => {
    try {
      try {
        await api.delete(`/hardware-profiles/${pillId}`);
      } catch {
        await pillHardwareRepository.delete(pillId);
      }
      set((state) => {
        const newProfiles = { ...state.profiles };
        delete newProfiles[pillId];
        return { profiles: newProfiles };
      });
    } catch (error) {
      console.error('Failed to remove hardware profile', error);
      throw error;
    }
  },
}));

