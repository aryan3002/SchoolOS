/**
 * App Store - Zustand
 *
 * Global state management for the mobile app
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
interface Child {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  schoolName: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'parent' | 'teacher' | 'admin';
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Child selection
  selectedChildId: string | null;
  children: Child[];

  // UI state
  isOnboarded: boolean;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setChildren: (children: Child[]) => void;
  setSelectedChildId: (childId: string | null) => void;
  setOnboarded: (onboarded: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setNotifications: (enabled: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      selectedChildId: null,
      children: [],
      isOnboarded: false,
      theme: 'system',
      notifications: true,

      // Actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setToken: (token) =>
        set({
          token,
          isAuthenticated: !!token,
        }),

      setChildren: (children) =>
        set((state) => ({
          children,
          // Auto-select first child if none selected
          selectedChildId:
            state.selectedChildId ||
            (children.length > 0 ? children[0].id : null),
        })),

      setSelectedChildId: (childId) =>
        set({
          selectedChildId: childId,
        }),

      setOnboarded: (onboarded) =>
        set({
          isOnboarded: onboarded,
        }),

      setTheme: (theme) =>
        set({
          theme,
        }),

      setNotifications: (enabled) =>
        set({
          notifications: enabled,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          selectedChildId: null,
          children: [],
        }),
    }),
    {
      name: 'schoolos-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields
        token: state.token,
        isOnboarded: state.isOnboarded,
        theme: state.theme,
        notifications: state.notifications,
        selectedChildId: state.selectedChildId,
      }),
    }
  )
);

// Selectors for common patterns
export const useSelectedChild = () => {
  const selectedChildId = useAppStore((state) => state.selectedChildId);
  const children = useAppStore((state) => state.children);
  return children.find((c) => c.id === selectedChildId);
};

export const useIsAuthenticated = () => {
  return useAppStore((state) => state.isAuthenticated);
};

export const useUser = () => {
  return useAppStore((state) => state.user);
};
