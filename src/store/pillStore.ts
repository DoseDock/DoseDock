import { create } from 'zustand';
import { Platform } from 'react-native';
import type { Pill } from '@types';
import { pillRepository } from '@data/repositories/PillRepository';
import { api } from '../api/client';
import { graphQLConfig, isGraphQLAvailable } from '@/config/env';
import { deleteMedication, fetchMedications, mapMedicationToPill, upsertMedication } from '@/api/medications';
import { useSessionStore } from './sessionStore';

interface PillStore {
  pills: Map<string, Pill>;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadPills: () => Promise<void>;
  getPillById: (id: string) => Pill | undefined;
  addPill: (pill: Omit<Pill, 'id' | 'createdAt'>) => Promise<Pill>;
  updatePill: (id: string, updates: Partial<Omit<Pill, 'id' | 'createdAt'>>) => Promise<void>;
  deletePill: (id: string) => Promise<void>;
  decrementStock: (id: string, amount: number) => Promise<void>;
  refreshPills: () => Promise<void>;
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

export const usePillStore = create<PillStore>((set, get) => ({
  pills: new Map(),
  isLoading: false,
  error: null,

  loadPills: async () => {
    set({ isLoading: true, error: null });
    try {
      if (GRAPHQL_ENABLED) {
        try {
          const patientId = ensureGraphQLPatientId();
          const medications = await fetchMedications(patientId);
          const pillMap = new Map(medications.map((med) => [med.id, mapMedicationToPill(med)]));
          set({ pills: pillMap, isLoading: false });
          return;
        } catch (graphQLError) {
          console.warn('GraphQL medications query failed, falling back to local stores.', graphQLError);
        }
      }

      try {
        const pills = await api.get<Pill[]>('/pills');
        const pillMap = new Map(pills.map((pill) => [pill.id, pill]));
        set({ pills: pillMap, isLoading: false });
        return;
      } catch (networkError) {
        console.warn('Pill store API unavailable, falling back to SQLite/sample data.', networkError);
      }

      if (!CAN_USE_SQLITE) {
        throw new Error(WEB_FALLBACK_ERROR);
      }

      const pills = await pillRepository.getAll();
      const pillMap = new Map(pills.map((pill) => [pill.id, pill]));
      set({ pills: pillMap, isLoading: false });
    } catch (error) {
      console.error('Failed to load pills:', error);
      set({
        pills: new Map(),
        isLoading: false,
        error:
          error instanceof Error && error.message === WEB_FALLBACK_ERROR
            ? WEB_FALLBACK_ERROR
            : 'Unable to load medications.',
      });
    }
  },

  getPillById: (id: string) => {
    return get().pills.get(id);
  },

  addPill: async (pillData) => {
    set({ isLoading: true, error: null });
    try {
      if (GRAPHQL_ENABLED) {
        try {
          const patientId = pillData.patientId || ensureGraphQLPatientId();
          const medication = await upsertMedication({
            patientId,
            name: pillData.name,
            color: pillData.color,
            shape: pillData.shape,
            cartridgeIndex: pillData.cartridgeIndex,
            stockCount: pillData.stockCount,
            lowStockThreshold: pillData.lowStockThreshold,
            maxDailyDose: pillData.maxDailyDose,
            metadata: pillData.metadata,
          });
          const pill = mapMedicationToPill(medication);
          set((state) => {
            const newPills = new Map(state.pills);
            newPills.set(pill.id, pill);
            return { pills: newPills, isLoading: false };
          });
          return pill;
        } catch (graphQLError) {
          console.warn('GraphQL add pill failed, falling back to local repository.', graphQLError);
        }
      }

      let pill: Pill;
      try {
        pill = await api.post<Pill>('/pills', pillData);
      } catch {
        if (!CAN_USE_SQLITE) {
          throw new Error(WEB_FALLBACK_ERROR);
        }
        pill = await pillRepository.create(pillData);
      }
      set((state) => {
        const newPills = new Map(state.pills);
        newPills.set(pill.id, pill);
        return { pills: newPills, isLoading: false };
      });
      return pill;
    } catch (error) {
      console.error('Failed to add pill:', error);
      set({ error: 'Failed to add pill', isLoading: false });
      throw error;
    }
  },

  updatePill: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      if (GRAPHQL_ENABLED) {
        try {
          const existing = get().pills.get(id);
          if (!existing) {
            throw new Error('Medication not found in local cache; reload before updating.');
          }
          const medication = await upsertMedication({
            id,
            patientId: existing.patientId || ensureGraphQLPatientId(),
            name: updates.name ?? existing.name,
            color: updates.color ?? existing.color,
            shape: updates.shape ?? existing.shape,
            cartridgeIndex: updates.cartridgeIndex ?? existing.cartridgeIndex,
            stockCount: updates.stockCount ?? existing.stockCount,
            lowStockThreshold: updates.lowStockThreshold ?? existing.lowStockThreshold,
            maxDailyDose: updates.maxDailyDose ?? existing.maxDailyDose,
            metadata: updates.metadata ?? existing.metadata ?? {},
          });
          const pill = mapMedicationToPill(medication);
          set((state) => {
            const newPills = new Map(state.pills);
            newPills.set(id, pill);
            return { pills: newPills, isLoading: false };
          });
          return;
        } catch (graphQLError) {
          console.warn('GraphQL update pill failed, falling back to local repository.', graphQLError);
        }
      }

      try {
        await api.put(`/pills/${id}`, updates);
      } catch {
        if (!CAN_USE_SQLITE) {
          throw new Error(WEB_FALLBACK_ERROR);
        }
        await pillRepository.update(id, updates);
      }
      set((state) => {
        const newPills = new Map(state.pills);
        const existing = newPills.get(id);
        if (existing) {
          newPills.set(id, { ...existing, ...updates });
        }
        return { pills: newPills, isLoading: false };
      });
    } catch (error) {
      console.error('Failed to update pill:', error);
      set({ error: 'Failed to update pill', isLoading: false });
      throw error;
    }
  },

  deletePill: async (id) => {
    set({ isLoading: true, error: null });
    try {
      if (GRAPHQL_ENABLED) {
        try {
          await deleteMedication(id);
          set((state) => {
            const newPills = new Map(state.pills);
            newPills.delete(id);
            return { pills: newPills, isLoading: false };
          });
          return;
        } catch (graphQLError) {
          console.warn('GraphQL delete pill failed, falling back to local repository.', graphQLError);
        }
      }

      try {
        await api.delete(`/pills/${id}`);
      } catch {
        if (!CAN_USE_SQLITE) {
          throw new Error(WEB_FALLBACK_ERROR);
        }
        await pillRepository.delete(id);
      }
      set((state) => {
        const newPills = new Map(state.pills);
        newPills.delete(id);
        return { pills: newPills, isLoading: false };
      });
    } catch (error) {
      console.error('Failed to delete pill:', error);
      set({ error: 'Failed to delete pill', isLoading: false });
      throw error;
    }
  },

  decrementStock: async (id, amount) => {
    try {
      if (GRAPHQL_ENABLED) {
        try {
          const existing = get().pills.get(id);
          if (!existing) {
            throw new Error('Medication not found in local cache; reload before updating.');
          }
          const nextStock = Math.max(0, existing.stockCount - amount);
          const medication = await upsertMedication({
            id,
            patientId: existing.patientId || ensureGraphQLPatientId(),
            name: existing.name,
            color: existing.color,
            shape: existing.shape,
            cartridgeIndex: existing.cartridgeIndex,
            stockCount: nextStock,
            lowStockThreshold: existing.lowStockThreshold,
            maxDailyDose: existing.maxDailyDose,
            metadata: existing.metadata ?? {},
          });
          const pill = mapMedicationToPill(medication);
          set((state) => {
            const newPills = new Map(state.pills);
            newPills.set(id, pill);
            return { pills: newPills };
          });
          return;
        } catch (graphQLError) {
          console.warn('GraphQL decrement stock failed, falling back to local repository.', graphQLError);
        }
      }

      try {
        await api.put(`/pills/${id}`, { stockCount: Math.max(0, (get().pills.get(id)?.stockCount || 0) - amount) });
      } catch {
        if (!CAN_USE_SQLITE) {
          throw new Error(WEB_FALLBACK_ERROR);
        }
        await pillRepository.decrementStock(id, amount);
      }
      set((state) => {
        const newPills = new Map(state.pills);
        const existing = newPills.get(id);
        if (existing) {
          newPills.set(id, {
            ...existing,
            stockCount: Math.max(0, existing.stockCount - amount),
          });
        }
        return { pills: newPills };
      });
    } catch (error) {
      console.error('Failed to decrement stock:', error);
      throw error;
    }
  },

  refreshPills: async () => {
    await get().loadPills();
  },
}));



