/**
 * Property-Based Tests for Auth Store
 * Feature: walking-safely-app
 *
 * Tests state notification using property-based testing with fast-check
 */

import fc from 'fast-check';
import { useAuthStore, AuthState } from '../authStore';

// Reset store before each test
beforeEach(() => {
  useAuthStore.setState({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    attemptsRemaining: null,
    lockedUntil: null,
  });
});

/**
 * Arbitrary for generating valid User objects
 */
const userArbitrary = fc.record({
  id: fc.integer({ min: 1 }),
  name: fc.string({ minLength: 2, maxLength: 50 }),
  email: fc.emailAddress(),
  locale: fc.constantFrom('pt_BR' as const, 'en' as const, 'es' as const),
  created_at: fc.date().map((d) => d.toISOString()),
});

/**
 * Arbitrary for generating valid tokens
 */
const tokenArbitrary = fc.string({ minLength: 10, maxLength: 100 });

describe('Auth Store - Property Tests', () => {
  /**
   * Feature: walking-safely-app, Property 10: Notificação de Mudança de Estado
   * Validates: Requisito 2.3
   *
   * For any state change in the Zustand store, all subscribed components
   * should be notified and re-rendered with the new value.
   */
  describe('Property 10: State Change Notification', () => {
    it('should notify subscribers when user state changes', () => {
      fc.assert(
        fc.property(userArbitrary, (user) => {
          const notifications: AuthState[] = [];

          // Subscribe to state changes
          const unsubscribe = useAuthStore.subscribe((state) => {
            notifications.push({ ...state });
          });

          // Change state
          useAuthStore.getState().setUser(user);

          // Verify notification was received with correct value
          const lastNotification = notifications[notifications.length - 1];
          const currentState = useAuthStore.getState();

          unsubscribe();

          // Both the notification and current state should match the set value
          return (
            lastNotification !== undefined &&
            JSON.stringify(lastNotification.user) === JSON.stringify(user) &&
            JSON.stringify(currentState.user) === JSON.stringify(user)
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should notify subscribers when token state changes', () => {
      fc.assert(
        fc.property(tokenArbitrary, (token) => {
          const notifications: AuthState[] = [];

          // Subscribe to state changes
          const unsubscribe = useAuthStore.subscribe((state) => {
            notifications.push({ ...state });
          });

          // Change state
          useAuthStore.getState().setToken(token);

          // Verify notification was received with correct value
          const lastNotification = notifications[notifications.length - 1];
          const currentState = useAuthStore.getState();

          unsubscribe();

          return lastNotification.token === token && currentState.token === token;
        }),
        { numRuns: 100 }
      );
    });

    it('should notify subscribers when isAuthenticated changes via setToken', () => {
      fc.assert(
        fc.property(fc.oneof(tokenArbitrary, fc.constant(null)), (token) => {
          const notifications: AuthState[] = [];

          // Subscribe to state changes
          const unsubscribe = useAuthStore.subscribe((state) => {
            notifications.push({ ...state });
          });

          // Change state
          useAuthStore.getState().setToken(token);

          // Verify notification was received with correct value
          const expectedAuth = !!token;
          const lastNotification = notifications[notifications.length - 1];
          const currentState = useAuthStore.getState();

          unsubscribe();

          return (
            lastNotification.isAuthenticated === expectedAuth &&
            currentState.isAuthenticated === expectedAuth
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should notify subscribers when error state changes', () => {
      fc.assert(
        fc.property(fc.oneof(fc.string({ minLength: 1 }), fc.constant(null)), (error) => {
          const notifications: AuthState[] = [];

          // Subscribe to state changes
          const unsubscribe = useAuthStore.subscribe((state) => {
            notifications.push({ ...state });
          });

          // Change state
          useAuthStore.getState().setError(error);

          // Verify notification was received with correct value
          const lastNotification = notifications[notifications.length - 1];
          const currentState = useAuthStore.getState();

          unsubscribe();

          return lastNotification.error === error && currentState.error === error;
        }),
        { numRuns: 100 }
      );
    });

    it('should notify subscribers when loading state changes', () => {
      fc.assert(
        fc.property(fc.boolean(), (isLoading) => {
          const notifications: AuthState[] = [];

          // Subscribe to state changes
          const unsubscribe = useAuthStore.subscribe((state) => {
            notifications.push({ ...state });
          });

          // Change state
          useAuthStore.getState().setLoading(isLoading);

          // Verify notification was received with correct value
          const lastNotification = notifications[notifications.length - 1];
          const currentState = useAuthStore.getState();

          unsubscribe();

          return (
            lastNotification.isLoading === isLoading && currentState.isLoading === isLoading
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should notify subscribers when lock info changes', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.integer({ min: 0, max: 5 }), fc.constant(null)),
          fc.oneof(fc.date().map((d) => d.toISOString()), fc.constant(null)),
          (attempts, lockedUntil) => {
            const notifications: AuthState[] = [];

            // Subscribe to state changes
            const unsubscribe = useAuthStore.subscribe((state) => {
              notifications.push({ ...state });
            });

            // Change state
            useAuthStore.getState().setLockInfo(attempts, lockedUntil);

            // Verify notification was received with correct values
            const lastNotification = notifications[notifications.length - 1];
            const currentState = useAuthStore.getState();

            unsubscribe();

            return (
              lastNotification.attemptsRemaining === attempts &&
              lastNotification.lockedUntil === lockedUntil &&
              currentState.attemptsRemaining === attempts &&
              currentState.lockedUntil === lockedUntil
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should notify subscribers and update all state correctly on login', () => {
      fc.assert(
        fc.property(userArbitrary, tokenArbitrary, (user, token) => {
          const notifications: AuthState[] = [];

          // Subscribe to state changes
          const unsubscribe = useAuthStore.subscribe((state) => {
            notifications.push({ ...state });
          });

          // Perform login
          useAuthStore.getState().login(user, token);

          const state = useAuthStore.getState();
          const lastNotification = notifications[notifications.length - 1];

          unsubscribe();

          // Verify all state is correctly set after login
          return (
            JSON.stringify(state.user) === JSON.stringify(user) &&
            state.token === token &&
            state.isAuthenticated === true &&
            state.error === null &&
            state.attemptsRemaining === null &&
            state.lockedUntil === null &&
            lastNotification.isAuthenticated === true
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should notify subscribers and reset all state correctly on logout', () => {
      fc.assert(
        fc.property(userArbitrary, tokenArbitrary, (user, token) => {
          // First login
          useAuthStore.getState().login(user, token);

          const notifications: AuthState[] = [];

          // Subscribe to state changes
          const unsubscribe = useAuthStore.subscribe((state) => {
            notifications.push({ ...state });
          });

          // Perform logout
          useAuthStore.getState().logout();

          const state = useAuthStore.getState();
          const lastNotification = notifications[notifications.length - 1];

          unsubscribe();

          // Verify all state is correctly reset after logout
          return (
            state.user === null &&
            state.token === null &&
            state.isAuthenticated === false &&
            state.error === null &&
            state.attemptsRemaining === null &&
            state.lockedUntil === null &&
            lastNotification.isAuthenticated === false
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should notify subscribers when clearError is called', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (errorMessage) => {
          // Set an error first
          useAuthStore.getState().setError(errorMessage);

          const notifications: AuthState[] = [];

          // Subscribe to state changes
          const unsubscribe = useAuthStore.subscribe((state) => {
            notifications.push({ ...state });
          });

          // Clear error
          useAuthStore.getState().clearError();

          const currentError = useAuthStore.getState().error;
          const lastNotification = notifications[notifications.length - 1];

          unsubscribe();

          // Verify error was cleared and notification was sent
          return currentError === null && lastNotification.error === null;
        }),
        { numRuns: 100 }
      );
    });
  });
});
