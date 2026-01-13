/**
 * Navigation Property Tests
 * Feature: walking-safely-app
 *
 * Tests navigation state using property-based testing with fast-check
 */

import fc from 'fast-check';
import { useAuthStore } from '@/features/auth/store/authStore';
import { User } from '@/features/auth/data/api/authApi';

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
 * Helper function to determine which navigator should be displayed
 * based on authentication state.
 * 
 * This mirrors the logic in RootNavigator.tsx
 */
const getExpectedNavigator = (isAuthenticated: boolean): 'AuthNavigator' | 'AppNavigator' => {
  return isAuthenticated ? 'AppNavigator' : 'AuthNavigator';
};

/**
 * Arbitrary for generating valid User objects
 */
const userArbitrary = fc.record({
  id: fc.integer({ min: 1 }),
  name: fc.string({ minLength: 2, maxLength: 100 }),
  email: fc.emailAddress(),
  locale: fc.constantFrom('pt_BR' as const, 'en' as const, 'es' as const),
  created_at: fc.date().map((d) => d.toISOString()),
});

/**
 * Arbitrary for generating valid tokens
 */
const tokenArbitrary = fc.string({ minLength: 10, maxLength: 500 });

describe('Navigation Property Tests', () => {
  /**
   * Property 6: Navegação por Estado de Autenticação
   * 
   * *Para qualquer* estado de autenticação (autenticado ou não autenticado),
   * o navegador exibido DEVE corresponder ao estado: Auth_Navigator quando
   * não autenticado, App_Navigator quando autenticado.
   * 
   * **Valida: Requisitos 4.3, 4.4**
   */
  describe('Property 6: Navigation by Authentication State', () => {
    it('should show AuthNavigator when not authenticated (isAuthenticated: false)', () => {
      fc.assert(
        fc.property(fc.constant(false), (isAuthenticated) => {
          // Set the store state
          useAuthStore.setState({ isAuthenticated, token: null, user: null });
          
          // Get the current state
          const state = useAuthStore.getState();
          
          // Verify the expected navigator
          const expectedNavigator = getExpectedNavigator(state.isAuthenticated);
          
          return expectedNavigator === 'AuthNavigator';
        }),
        { numRuns: 100 }
      );
    });

    it('should show AppNavigator when authenticated (isAuthenticated: true)', () => {
      fc.assert(
        fc.property(userArbitrary, tokenArbitrary, (user, token) => {
          // Set the store state with user and token
          useAuthStore.setState({ 
            isAuthenticated: true, 
            token, 
            user: user as User 
          });
          
          // Get the current state
          const state = useAuthStore.getState();
          
          // Verify the expected navigator
          const expectedNavigator = getExpectedNavigator(state.isAuthenticated);
          
          return expectedNavigator === 'AppNavigator';
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly map any authentication state to the appropriate navigator', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.option(userArbitrary, { nil: undefined }),
          fc.option(tokenArbitrary, { nil: undefined }),
          (isAuthenticated, maybeUser, maybeToken) => {
            // Set the store state
            useAuthStore.setState({
              isAuthenticated,
              token: maybeToken ?? null,
              user: maybeUser ? (maybeUser as User) : null,
            });
            
            // Get the current state
            const state = useAuthStore.getState();
            
            // Verify the expected navigator matches the authentication state
            const expectedNavigator = getExpectedNavigator(state.isAuthenticated);
            
            if (state.isAuthenticated) {
              return expectedNavigator === 'AppNavigator';
            } else {
              return expectedNavigator === 'AuthNavigator';
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should transition from AuthNavigator to AppNavigator on login', () => {
      fc.assert(
        fc.property(userArbitrary, tokenArbitrary, (user, token) => {
          // Start unauthenticated
          useAuthStore.setState({ 
            isAuthenticated: false, 
            token: null, 
            user: null 
          });
          
          // Verify initial state shows AuthNavigator
          const initialNavigator = getExpectedNavigator(useAuthStore.getState().isAuthenticated);
          if (initialNavigator !== 'AuthNavigator') {
            return false;
          }
          
          // Perform login
          useAuthStore.getState().login(user as User, token);
          
          // Verify state now shows AppNavigator
          const finalNavigator = getExpectedNavigator(useAuthStore.getState().isAuthenticated);
          
          return finalNavigator === 'AppNavigator';
        }),
        { numRuns: 100 }
      );
    });

    it('should transition from AppNavigator to AuthNavigator on logout', () => {
      fc.assert(
        fc.property(userArbitrary, tokenArbitrary, (user, token) => {
          // Start authenticated
          useAuthStore.getState().login(user as User, token);
          
          // Verify initial state shows AppNavigator
          const initialNavigator = getExpectedNavigator(useAuthStore.getState().isAuthenticated);
          if (initialNavigator !== 'AppNavigator') {
            return false;
          }
          
          // Perform logout
          useAuthStore.getState().logout();
          
          // Verify state now shows AuthNavigator
          const finalNavigator = getExpectedNavigator(useAuthStore.getState().isAuthenticated);
          
          return finalNavigator === 'AuthNavigator';
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain consistent navigator state for any sequence of auth state changes', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.record({ type: fc.constant('login' as const), user: userArbitrary, token: tokenArbitrary }),
              fc.record({ type: fc.constant('logout' as const) })
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (actions) => {
            // Reset to initial state
            useAuthStore.setState({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
              attemptsRemaining: null,
              lockedUntil: null,
            });
            
            // Apply each action and verify navigator state
            for (const action of actions) {
              if (action.type === 'login') {
                useAuthStore.getState().login(action.user as User, action.token);
              } else {
                useAuthStore.getState().logout();
              }
              
              const state = useAuthStore.getState();
              const expectedNavigator = getExpectedNavigator(state.isAuthenticated);
              
              // Verify consistency
              if (state.isAuthenticated && expectedNavigator !== 'AppNavigator') {
                return false;
              }
              if (!state.isAuthenticated && expectedNavigator !== 'AuthNavigator') {
                return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
