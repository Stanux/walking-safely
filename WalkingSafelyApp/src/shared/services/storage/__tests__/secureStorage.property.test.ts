/**
 * Property-Based Tests for Secure Storage Service
 * Feature: walking-safely-app, Property 5: Round-Trip de Token Storage
 * Validates: Requisitos 2.5, 10.1
 *
 * Tests that storing and retrieving tokens produces the same value
 */

import fc from 'fast-check';
import * as SecureStore from 'expo-secure-store';
import { secureStorage, getToken, setToken, clearToken } from '../secureStorage';

// Create a mock storage to simulate real behavior
const mockStorage = new Map<string, string>();

// Setup mocks to use the in-memory storage
beforeEach(() => {
  mockStorage.clear();

  (SecureStore.setItemAsync as jest.Mock).mockImplementation(
    async (key: string, value: string) => {
      mockStorage.set(key, value);
    }
  );

  (SecureStore.getItemAsync as jest.Mock).mockImplementation(
    async (key: string) => {
      return mockStorage.get(key) ?? null;
    }
  );

  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(
    async (key: string) => {
      mockStorage.delete(key);
    }
  );
});

describe('Secure Storage - Property Tests', () => {
  /**
   * Feature: walking-safely-app, Property 5: Round-Trip de Token Storage
   *
   * For any valid token (non-empty string), storing the token and then
   * retrieving it MUST produce exactly the same token.
   */
  it('should round-trip tokens correctly for all valid inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate non-empty strings as valid tokens
        fc.string({ minLength: 1 }),
        async (token) => {
          // Store the token
          await secureStorage.setToken(token);

          // Retrieve the token
          const retrievedToken = await secureStorage.getToken();

          // Verify round-trip produces the same value
          expect(retrievedToken).toBe(token);

          // Clean up
          await secureStorage.clearToken();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Alias functions work identically to secureStorage methods
   *
   * For any valid token, the alias functions (setToken, getToken, clearToken)
   * should behave identically to the secureStorage methods.
   */
  it('should have alias functions that work identically', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (token) => {
          // Use alias to store
          await setToken(token);

          // Use alias to retrieve
          const retrievedToken = await getToken();

          // Verify round-trip
          expect(retrievedToken).toBe(token);

          // Use alias to clear
          await clearToken();

          // Verify cleared
          const clearedToken = await getToken();
          expect(clearedToken).toBeNull();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: User data round-trip preserves object structure
   *
   * For any valid user object, storing and retrieving should produce
   * an equivalent object.
   */
  it('should round-trip user data correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1 }),
          name: fc.string({ minLength: 1 }),
          email: fc.emailAddress(),
        }),
        async (user) => {
          // Store the user
          await secureStorage.setUser(user);

          // Retrieve the user
          const retrievedUser = await secureStorage.getUser<typeof user>();

          // Verify round-trip produces equivalent object
          expect(retrievedUser).toEqual(user);

          // Clean up
          await secureStorage.clearUser();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: clearAll removes both token and user data
   *
   * For any stored token and user, clearAll should remove both.
   */
  it('should clear all data when clearAll is called', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.record({
          id: fc.integer({ min: 1 }),
          name: fc.string({ minLength: 1 }),
        }),
        async (token, user) => {
          // Store both token and user
          await secureStorage.setToken(token);
          await secureStorage.setUser(user);

          // Verify both are stored
          expect(await secureStorage.getToken()).toBe(token);
          expect(await secureStorage.getUser()).toEqual(user);

          // Clear all
          await secureStorage.clearAll();

          // Verify both are cleared
          expect(await secureStorage.getToken()).toBeNull();
          expect(await secureStorage.getUser()).toBeNull();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Overwriting token replaces previous value
   *
   * For any two tokens, storing the second should replace the first.
   */
  it('should overwrite previous token when storing new one', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (token1, token2) => {
          // Store first token
          await secureStorage.setToken(token1);
          expect(await secureStorage.getToken()).toBe(token1);

          // Store second token
          await secureStorage.setToken(token2);

          // Verify second token replaced first
          expect(await secureStorage.getToken()).toBe(token2);

          // Clean up
          await secureStorage.clearToken();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: getToken returns null when no token is stored
   *
   * After clearing or before storing, getToken should return null.
   */
  it('should return null when no token is stored', async () => {
    // Ensure storage is empty
    await secureStorage.clearToken();

    const token = await secureStorage.getToken();
    expect(token).toBeNull();
  });

  /**
   * Property: getUser returns null when no user is stored
   *
   * After clearing or before storing, getUser should return null.
   */
  it('should return null when no user is stored', async () => {
    // Ensure storage is empty
    await secureStorage.clearUser();

    const user = await secureStorage.getUser();
    expect(user).toBeNull();
  });
});
