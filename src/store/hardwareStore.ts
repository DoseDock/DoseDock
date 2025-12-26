import { create } from 'zustand';
import { Platform } from 'react-native';
import type { PillHardwareProfile } from '@types';
import { pillHardwareRepository } from '@data/repositories/PillHardwareRepository';
import { api } from '../api/client';
import { graphQLConfig, isGraphQLAvailable } from '@/config/env';
import { extractHardwareProfile, mapMedicationToPill, upsertMedication } from '@/api/medications';
import { usePillStore } from './pillStore';
import { useSessionStore } from './sessionStore';

interface HardwareStore {
  profiles: Record<string, PillHardwareProfile>;
  isLoading: boolean;
  error?: string;

  loadProfiles: () => Promise<void>;
  getProfile: (pillId: string) => PillHardwareProfile | undefined;
  saveProfile: (profile: PillHardwareProfile) => Promise<void>;
  removeProfile: (pillId: string) => Promise<void>;
}

const GRAPHQL_ENABLED = isGraphQLAvailable;
const CAN_USE_SQLITE = Platform.OS !== 'web';
const WEB_FALLBACK_ERROR =
  'Local SQLite fallback is not available in the web build. Either run the REST seed server (npm run server) at http://localhost:4000 or set EXPO_PUBLIC_GRAPHQL_URL + EXPO_PUBLIC_GRAPHQL_PATIENT_ID to sync via GraphQL.';

const ensureGraphQLPatientId = () => {
  const runtimePatientId = useSessionStore.getState().patient?.id;
  if (runtimePatientId) {
    return runtimePatientId;
  }
  if (graphQLConfig.patientId) {
    return graphQLConfig.patientId;
  }
  throw new Error(
    'No patient selected. Log in first or set EXPO_PUBLIC_GRAPHQL_PATIENT_ID to enable GraphQL mutations.'
  );
};

export const useHardwareStore = create<HardwareStore>((set, get) => ({
  profiles: {},
  isLoading: false,
  error: undefined,

  loadProfiles: async () => {
    set({ isLoading: true, error: undefined });
    try {
      if (GRAPHQL_ENABLED) {
        try {
          if (usePillStore.getState().pills.size === 0) {
            await usePillStore.getState().loadPills();
          }
          const latestPills = usePillStore.getState().pills;
          const profileMap: Record<string, PillHardwareProfile> = {};
          latestPills.forEach((pill) => {
            const profile = extractHardwareProfile(pill);
            if (profile) {
              profileMap[pill.id] = profile;
            }
          });
          set({ profiles: profileMap, isLoading: false });
          return;
        } catch (graphQLError) {
          console.warn('GraphQL hardware profile load failed, falling back to local data.', graphQLError);
        }
      }

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

      if (!CAN_USE_SQLITE) {
        throw new Error(WEB_FALLBACK_ERROR);
      }

      const profiles = await pillHardwareRepository.getAll();
      const profileMap = profiles.reduce<Record<string, PillHardwareProfile>>((acc, profile) => {
        acc[profile.pillId] = profile;
        return acc;
      }, {});
      set({ profiles: profileMap, isLoading: false });
    } catch (error) {
      console.error('Failed to load hardware profiles', error);
      set({
        profiles: {},
        isLoading: false,
        error:
          error instanceof Error && error.message === WEB_FALLBACK_ERROR
            ? WEB_FALLBACK_ERROR
            : 'Unable to load hardware mappings.',
      });
    }
  },

  getProfile: (pillId: string) => {
    return get().profiles[pillId];
  },

  saveProfile: async (profile) => {
    try {
      if (GRAPHQL_ENABLED) {
        try {
          const patientId = ensureGraphQLPatientId();
          const pill = usePillStore.getState().pills.get(profile.pillId);
          if (!pill) {
            throw new Error('Load medications before saving hardware mappings.');
          }
          const metadata = {
            ...(pill.metadata ?? {}),
            hardwareProfile: {
              ...profile,
            },
          };
          const medication = await upsertMedication({
            id: pill.id,
            patientId: pill.patientId || patientId,
            name: pill.name,
            color: pill.color,
            shape: pill.shape,
            cartridgeIndex: profile.siloSlot ?? pill.cartridgeIndex,
            stockCount: pill.stockCount,
            lowStockThreshold: pill.lowStockThreshold,
            maxDailyDose: pill.maxDailyDose,
            metadata,
          });
          const updatedPill = mapMedicationToPill(medication);
          usePillStore.setState((state) => {
            const newPills = new Map(state.pills);
            newPills.set(updatedPill.id, updatedPill);
            return { pills: newPills, isLoading: state.isLoading, error: state.error };
          });
          set((state) => ({
            profiles: {
              ...state.profiles,
              [profile.pillId]: profile,
            },
          }));
          return;
        } catch (graphQLError) {
          console.warn('GraphQL hardware profile save failed, falling back to local repositories.', graphQLError);
        }
      }

      try {
        await api.put(`/hardware-profiles/${profile.pillId}`, profile);
      } catch {
        if (!CAN_USE_SQLITE) {
          throw new Error(WEB_FALLBACK_ERROR);
        }
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
      if (GRAPHQL_ENABLED) {
        try {
          const patientId = ensureGraphQLPatientId();
          const pill = usePillStore.getState().pills.get(pillId);
          if (!pill) {
            throw new Error('Load medications before removing hardware mappings.');
          }
          const metadata: Record<string, unknown> = { ...(pill.metadata ?? {}) };
          delete metadata.hardwareProfile;
          const medication = await upsertMedication({
            id: pill.id,
            patientId: pill.patientId || patientId,
            name: pill.name,
            color: pill.color,
            shape: pill.shape,
            cartridgeIndex: pill.cartridgeIndex,
            stockCount: pill.stockCount,
            lowStockThreshold: pill.lowStockThreshold,
            maxDailyDose: pill.maxDailyDose,
            metadata,
          });
          const updatedPill = mapMedicationToPill(medication);
          usePillStore.setState((state) => {
            const newPills = new Map(state.pills);
            newPills.set(updatedPill.id, updatedPill);
            return { pills: newPills, isLoading: state.isLoading, error: state.error };
          });
          set((state) => {
            const newProfiles = { ...state.profiles };
            delete newProfiles[pillId];
            return { profiles: newProfiles };
          });
          return;
        } catch (graphQLError) {
          console.warn('GraphQL hardware profile removal failed, falling back to local repositories.', graphQLError);
        }
      }

      try {
        await api.delete(`/hardware-profiles/${pillId}`);
      } catch {
        if (!CAN_USE_SQLITE) {
          throw new Error(WEB_FALLBACK_ERROR);
        }
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

