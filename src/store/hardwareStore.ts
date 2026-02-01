import { create } from 'zustand';
import type { Pill } from '@types';
import { usePillStore } from './pillStore';

/**
 * Simplified hardware store.
 *
 * With 3 fixed silos (cartridgeIndex 0, 1, 2) tracked directly on each Pill,
 * this store is a thin read-only view derived from the pill store.
 * Silo assignment is managed by updating a pill's cartridgeIndex via pillStore.updatePill().
 */

type SiloAssignment = {
  siloIndex: number; // 0, 1, or 2
  pill: Pill | null;
};

interface HardwareStore {
  isLoading: boolean;
  error?: string;

  /** Returns the pill assigned to a given silo index, or null. */
  getSiloAssignment: (siloIndex: number) => SiloAssignment;

  /** Returns all 3 silo assignments (indices 0, 1, 2). */
  getAllSiloAssignments: () => SiloAssignment[];

  /** Assign a pill to a silo by updating its cartridgeIndex via pillStore. */
  assignPillToSilo: (pillId: string, siloIndex: number) => Promise<void>;
}

export const useHardwareStore = create<HardwareStore>((set) => ({
  isLoading: false,
  error: undefined,

  getSiloAssignment: (siloIndex: number): SiloAssignment => {
    const pills = usePillStore.getState().pills;
    let assignedPill: Pill | null = null;
    pills.forEach((pill) => {
      if (pill.cartridgeIndex === siloIndex) {
        assignedPill = pill;
      }
    });
    return { siloIndex, pill: assignedPill };
  },

  getAllSiloAssignments: (): SiloAssignment[] => {
    const pills = usePillStore.getState().pills;
    const silos: SiloAssignment[] = [
      { siloIndex: 0, pill: null },
      { siloIndex: 1, pill: null },
      { siloIndex: 2, pill: null },
    ];
    pills.forEach((pill) => {
      const idx = pill.cartridgeIndex;
      if (idx != null && idx >= 0 && idx <= 2) {
        silos[idx].pill = pill;
      }
    });
    return silos;
  },

  assignPillToSilo: async (pillId: string, siloIndex: number) => {
    set({ isLoading: true, error: undefined });
    try {
      await usePillStore.getState().updatePill(pillId, { cartridgeIndex: siloIndex });
      set({ isLoading: false });
    } catch (error) {
      console.error('Failed to assign pill to silo:', error);
      set({ isLoading: false, error: 'Failed to assign pill to silo.' });
      throw error;
    }
  },
}));
