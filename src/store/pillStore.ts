import { create } from 'zustand';
import type { Pill } from '@types';
import { graphQLConfig } from '@/config/env';
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

const ensurePatientId = (): string => {
  const runtimePatientId = useSessionStore.getState().patient?.id;
  if (runtimePatientId) {
    return runtimePatientId;
  }
  if (graphQLConfig.patientId) {
    return graphQLConfig.patientId;
  }
  throw new Error(
    'No patient selected. Log in first or set EXPO_PUBLIC_GRAPHQL_PATIENT_ID.'
  );
};

export const usePillStore = create<PillStore>((set, get) => ({
  pills: new Map(),
  isLoading: false,
  error: null,

  loadPills: async () => {
    set({ isLoading: true, error: null });
    try {
      const patientId = ensurePatientId();
      const medications = await fetchMedications(patientId);
      const pillMap = new Map(medications.map((med) => [med.id, mapMedicationToPill(med)]));
      set({ pills: pillMap, isLoading: false });
    } catch (error) {
      console.error('Failed to load pills:', error);
      set({
        pills: new Map(),
        isLoading: false,
        error: 'Unable to load medications.',
      });
    }
  },

  getPillById: (id: string) => {
    return get().pills.get(id);
  },

  addPill: async (pillData) => {
    set({ isLoading: true, error: null });
    try {
      const patientId = pillData.patientId || ensurePatientId();
      const medication = await upsertMedication({
        patientId,
        name: pillData.name,
        color: pillData.color,
        cartridgeIndex: pillData.cartridgeIndex,
        stockCount: pillData.stockCount,
        lowStockThreshold: pillData.lowStockThreshold,
        maxDailyDose: pillData.maxDailyDose,
      });
      const pill = mapMedicationToPill(medication);
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
      const existing = get().pills.get(id);
      if (!existing) {
        throw new Error('Medication not found in local cache; reload before updating.');
      }
      const medication = await upsertMedication({
        id,
        patientId: existing.patientId || ensurePatientId(),
        name: updates.name ?? existing.name,
        color: updates.color ?? existing.color,
        cartridgeIndex: updates.cartridgeIndex ?? existing.cartridgeIndex,
        stockCount: updates.stockCount ?? existing.stockCount,
        lowStockThreshold: updates.lowStockThreshold ?? existing.lowStockThreshold,
        maxDailyDose: updates.maxDailyDose ?? existing.maxDailyDose,
      });
      const pill = mapMedicationToPill(medication);
      set((state) => {
        const newPills = new Map(state.pills);
        newPills.set(id, pill);
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
      await deleteMedication(id);
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
      const existing = get().pills.get(id);
      if (!existing) {
        throw new Error('Medication not found in local cache; reload before updating.');
      }
      const nextStock = Math.max(0, existing.stockCount - amount);
      const medication = await upsertMedication({
        id,
        patientId: existing.patientId || ensurePatientId(),
        name: existing.name,
        color: existing.color,
        cartridgeIndex: existing.cartridgeIndex,
        stockCount: nextStock,
        lowStockThreshold: existing.lowStockThreshold,
        maxDailyDose: existing.maxDailyDose,
      });
      const pill = mapMedicationToPill(medication);
      set((state) => {
        const newPills = new Map(state.pills);
        newPills.set(id, pill);
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
