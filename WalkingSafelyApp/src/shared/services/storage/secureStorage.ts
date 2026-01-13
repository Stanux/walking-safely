/**
 * Secure Storage Service
 * Provides storage for sensitive data like authentication tokens
 * Uses AsyncStorage for React Native compatibility
 * Note: For production, consider using react-native-keychain for encrypted storage
 *
 * @module shared/services/storage/secureStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@auth_token';
const USER_KEY = '@user_data';

/**
 * Secure storage service for managing authentication data
 */
export const secureStorage = {
  /**
   * Store authentication token
   * @param token - The authentication token to store
   */
  setToken: async (token: string): Promise<void> => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  /**
   * Retrieve stored authentication token
   * @returns The stored token or null if not found
   */
  getToken: async (): Promise<string | null> => {
    return await AsyncStorage.getItem(TOKEN_KEY);
  },

  /**
   * Remove stored authentication token
   */
  clearToken: async (): Promise<void> => {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },

  /**
   * Store user data
   * @param user - The user object to store
   */
  setUser: async (user: object): Promise<void> => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  /**
   * Retrieve stored user data
   * @returns The stored user object or null if not found
   */
  getUser: async <T>(): Promise<T | null> => {
    const data = await AsyncStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  /**
   * Remove stored user data
   */
  clearUser: async (): Promise<void> => {
    await AsyncStorage.removeItem(USER_KEY);
  },

  /**
   * Clear all stored authentication data (token and user)
   */
  clearAll: async (): Promise<void> => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  },
};

// Aliases for compatibility with design document
export const getToken = secureStorage.getToken;
export const setToken = secureStorage.setToken;
export const clearToken = secureStorage.clearToken;
