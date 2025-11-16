import { create } from 'zustand';
import type { Pill } from '@types';
import { pillRepository } from '@data/repositories/PillRepository';
import { api } from '../api/client';
import { SAMPLE_PILLS } from '@data/sampleData';

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
      try {
        const pills = await api.get<Pill[]>('/pills');
        const pillMap = new Map(pills.map((pill) => [pill.id, pill]));
        set({ pills: pillMap, isLoading: false });
        return;
      } catch (networkError) {
        console.warn('Pill store API unavailable, falling back to SQLite/sample data.', networkError);
      }

      const pills = await pillRepository.getAll();
      const source = pills.length > 0 ? pills : SAMPLE_PILLS;
      const pillMap = new Map(source.map((pill) => [pill.id, pill]));
      if (pills.length === 0) {
        console.warn('Pill store: no records found, falling back to sample data.');
      }
      set({ pills: pillMap, isLoading: false });
    } catch (error) {
      console.error('Failed to load pills:', error);
      const pillMap = new Map(SAMPLE_PILLS.map((pill) => [pill.id, pill]));
      set({
        pills: pillMap,
        isLoading: false,
        error: 'Unable to reach database, using sample data.',
      });
    }
  },

  getPillById: (id: string) => {
    return get().pills.get(id);
  },

  addPill: async (pillData) => {
    set({ isLoading: true, error: null });
    try {
      let pill;
      try {
        pill = await api.post<Pill>('/pills', pillData);
      } catch {
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
      try {
        await api.put(`/pills/${id}`, updates);
      } catch {
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
      try {
        await api.delete(`/pills/${id}`);
      } catch {
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
      try {
        await api.put(`/pills/${id}`, { stockCount: Math.max(0, (get().pills.get(id)?.stockCount || 0) - amount) });
      } catch {
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



