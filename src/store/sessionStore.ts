import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { graphQLConfig } from '@/config/env';

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  timezone: string;
};

export type SessionPatient = {
  id: string;
  firstName: string;
  lastName: string;
  timezone: string;
};

interface SessionState {
  user?: SessionUser;
  patient?: SessionPatient;
  setUser: (user: SessionUser) => void;
  setPatient: (patient: SessionPatient) => void;
  logout: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: undefined,
      patient: undefined,
      setUser: (user) => {
        set({ user });
        graphQLConfig.userId = user.id;
      },
      setPatient: (patient) => {
        set({ patient });
        graphQLConfig.patientId = patient.id;
      },
      logout: () => {
        set({ user: undefined, patient: undefined });
        graphQLConfig.userId = '';
        graphQLConfig.patientId = '';
      },
    }),
    {
      name: 'pillbox-session',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Helper accessors for non-hook usage (e.g., stores defined outside components)
export const sessionStore = {
  getState: () => useSessionStore.getState(),
};


