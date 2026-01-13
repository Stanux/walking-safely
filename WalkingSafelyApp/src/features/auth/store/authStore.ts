/**
 * Auth Store (Zustand)
 * Manages authentication state with persistence via AsyncStorage
 *
 * @module features/auth/store/authStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../data/api/authApi';

// ============================================================================
// Types
// ============================================================================

/**
 * Authentication state interface
 */
export interface AuthState {
  /** Current authenticated user */
  user: User | null;
  /** Authentication token */
  token: string | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Loading state for async operations */
  isLoading: boolean;
  /** Error message from last operation */
  error: string | null;
  /** Remaining login attempts before lockout */
  attemptsRemaining: number | null;
  /** Timestamp when account will be unlocked */
  lockedUntil: string | null;
}

/**
 * Authentication actions interface
 */
export interface AuthActions {
  /** Set the current user */
  setUser: (user: User | null) => void;
  /** Set the authentication token */
  setToken: (token: string | null) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set error message */
  setError: (error: string | null) => void;
  /** Set lock information (attempts remaining and locked until) */
  setLockInfo: (attempts: number | null, lockedUntil: string | null) => void;
  /** Login action - sets user, token and clears errors */
  login: (user: User, token: string) => void;
  /** Logout action - clears all auth state */
  logout: () => void;
  /** Clear error message */
  clearError: () => void;
}

/**
 * Combined auth store type
 */
export type AuthStore = AuthState & AuthActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  attemptsRemaining: null,
  lockedUntil: null,
};

// ============================================================================
// Store Creation
// ============================================================================

/**
 * Auth store with Zustand and AsyncStorage persistence
 *
 * Persists: user, token, isAuthenticated
 * Does not persist: isLoading, error, attemptsRemaining, lockedUntil
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuthStore();
 *
 * // Login
 * login(userData, token);
 *
 * // Logout
 * logout();
 *
 * // Check auth status
 * if (isAuthenticated) {
 *   // User is logged in
 * }
 * ```
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // Initial state
      ...initialState,

      // Actions
      setUser: (user) => set({ user }),

      setToken: (token) =>
        set({
          token,
          isAuthenticated: !!token,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      setLockInfo: (attemptsRemaining, lockedUntil) =>
        set({
          attemptsRemaining,
          lockedUntil,
        }),

      login: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
          error: null,
          attemptsRemaining: null,
          lockedUntil: null,
        }),

      logout: () =>
        set({
          ...initialState,
        }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential auth data
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

/**
 * Select only the user from auth state
 */
export const selectUser = (state: AuthStore) => state.user;

/**
 * Select only the authentication status
 */
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;

/**
 * Select only the loading state
 */
export const selectIsLoading = (state: AuthStore) => state.isLoading;

/**
 * Select only the error state
 */
export const selectError = (state: AuthStore) => state.error;

/**
 * Select lock information
 */
export const selectLockInfo = (state: AuthStore) => ({
  attemptsRemaining: state.attemptsRemaining,
  lockedUntil: state.lockedUntil,
});

export default useAuthStore;
