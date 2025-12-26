/**
 * Auth Store
 * Manages authentication state with secure token persistence
 * Requirements: 2.2, 2.5, 2.6
 */

import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {User} from '../types/models';
import {authService} from '../services/api/auth';
import {setAuthToken} from '../services/api/client';

/**
 * Auth store state interface
 */
interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Auth store actions interface
 */
interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User, token?: string) => void;
}

/**
 * Combined auth store type
 */
type AuthStore = AuthState & AuthActions;

/**
 * Keychain service name for secure token storage
 */
const KEYCHAIN_SERVICE = 'WalkingSafelyAuth';

/**
 * Save token securely using Keychain
 */
const saveTokenSecurely = async (token: string): Promise<void> => {
  try {
    await Keychain.setGenericPassword('auth_token', token, {
      service: KEYCHAIN_SERVICE,
    });
  } catch (error) {
    // Fallback to AsyncStorage if Keychain fails
    await AsyncStorage.setItem('@auth_token', token);
  }
};

/**
 * Load token from secure storage
 */
const loadTokenSecurely = async (): Promise<string | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
    });
    if (credentials) {
      return credentials.password;
    }
  } catch {
    // Fallback to AsyncStorage
    try {
      return await AsyncStorage.getItem('@auth_token');
    } catch {
      return null;
    }
  }
  return null;
};

/**
 * Remove token from secure storage
 */
const removeTokenSecurely = async (): Promise<void> => {
  try {
    await Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
  } catch {
    // Ignore errors
  }
  try {
    await AsyncStorage.removeItem('@auth_token');
  } catch {
    // Ignore errors
  }
};

/**
 * Initial auth state
 */
const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

/**
 * Auth store with persistence
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, _get) => ({
      ...initialState,

      /**
       * Login with email and password
       * Requirement 2.2: Store token securely after successful login
       */
      login: async (email: string, password: string) => {
        set({isLoading: true, error: null});
        try {
          console.log('Attempting login...');
          const response = await authService.login(email, password);
          console.log('Login response:', response);

          // Save token securely (Requirement 2.6)
          await saveTokenSecurely(response.token);

          // Update API client with token
          setAuthToken(response.token);

          console.log('Setting authenticated state...');
          set({
            token: response.token,
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          console.log('Login complete, isAuthenticated should be true');
        } catch (error) {
          console.log('Login error:', error);
          const errorMessage =
            error instanceof Error ? error.message : 'Login failed';
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      /**
       * Logout current user
       * Requirement 2.5: Remove token and redirect to login
       */
      logout: async () => {
        set({isLoading: true});
        try {
          await authService.logout();
        } catch {
          // Continue with local logout even if API call fails
        } finally {
          // Remove token from secure storage
          await removeTokenSecurely();

          // Clear API client token
          setAuthToken(null);

          // Reset state
          set({
            ...initialState,
            isLoading: false,
          });
        }
      },

      /**
       * Load stored authentication on app start
       * Requirement 2.6: Maintain user logged in between sessions
       */
      loadStoredAuth: async () => {
        set({isLoading: true});
        try {
          const token = await loadTokenSecurely();

          if (token) {
            // Set token in API client
            setAuthToken(token);

            // Verify token by fetching current user
            try {
              const user = await authService.getCurrentUser();
              set({
                token,
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            } catch {
              // Token is invalid, clear it
              await removeTokenSecurely();
              setAuthToken(null);
              set({
                ...initialState,
                isLoading: false,
              });
            }
          } else {
            set({isLoading: false});
          }
        } catch {
          set({isLoading: false});
        }
      },

      /**
       * Clear error state
       */
      clearError: () => {
        set({error: null});
      },

      /**
       * Set user data and mark as authenticated (for registration)
       */
      setUser: (user: User, token?: string) => {
        if (token) {
          // Save token securely and update state for registration flow
          saveTokenSecurely(token).then(() => {
            setAuthToken(token);
            set({
              user,
              token,
              isAuthenticated: true,
            });
          });
        } else {
          // Just update user data (for profile updates)
          set({user});
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user data, not token (token is stored securely)
      partialize: state => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export default useAuthStore;
