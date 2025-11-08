import { create } from 'zustand';
import type { Pill } from '@types';
import { pillRepository } from '@data/repositories/PillRepository';

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

export const usePillStore = create<PillStore>((set, get) => ({
  pills: new Map(),
  isLoading: false,
  error: null,

  loadPills: async () => {
    set({ isLoading: true, error: null });
    try {
      const pills = await pillRepository.getAll();
      const pillMap = new Map(pills.map((pill) => [pill.id, pill]));
      set({ pills: pillMap, isLoading: false });
    } catch (error) {
      console.error('Failed to load pills:', error);
      set({ error: 'Failed to load pills', isLoading: false });
    }
  },

  getPillById: (id: string) => {
    return get().pills.get(id);
  },

  addPill: async (pillData) => {
    set({ isLoading: true, error: null });
    try {
      const pill = await pillRepository.create(pillData);
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
      await pillRepository.update(id, updates);
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
      await pillRepository.delete(id);
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
      await pillRepository.decrementStock(id, amount);
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

