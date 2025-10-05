// src/stores/useAuthStore.ts
// Authentication state - hardcoded to "peter-eternal" for now, ready for real auth later

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  displayName: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User, token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Hardcoded for now - "peter-eternal" flow
      user: {
        id: 'peter-eternal',
        username: 'peter',
        displayName: 'Peter'
      },
      token: null,
      isAuthenticated: true,
      
      login: async (username: string, password: string) => {
        // TODO: Implement real auth
        // For now, just mock success
        set({
          user: { id: 'peter-eternal', username, displayName: username },
          token: 'mock-token',
          isAuthenticated: true,
        });
      },
      
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },
      
      setUser: (user: User, token: string) => {
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },
    }),
    {
      name: 'mira-auth-storage', // LocalStorage key
    }
  )
);

// Selector hooks for components
export const useCurrentUser = () => useAuthStore(state => state.user);
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated);
