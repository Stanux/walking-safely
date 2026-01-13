/**
 * Logout Use Case
 * Handles the logout flow: call API, clear storage, update store
 *
 * Requirements: 10.5, 10.6
 * - 10.5: App MUST provide logout functionality consuming POST /auth/logout
 * - 10.6: WHEN logout is executed, clear all stored session data
 *
 * @module features/auth/domain/useCases/logoutUseCase
 */

import { AxiosError } from 'axios';
import { authApi } from '../../data/api/authApi';
import { secureStorage } from '@/shared/services/storage/secureStorage';
import { useAuthStore } from '../../store/authStore';

// ============================================================================
// Types
// ============================================================================

export interface LogoutResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Use Case
// ============================================================================

/**
 * Execute logout use case
 *
 * Flow:
 * 1. Call logout API to invalidate token on server
 * 2. Clear all stored session data (token, user)
 * 3. Update auth store to logged out state
 *
 * Note: Even if API call fails, we still clear local data for security
 *
 * @returns Logout result with success status
 */
export const logoutUseCase = async (): Promise<LogoutResult> => {
  const { setLoading, logout } = useAuthStore.getState();

  try {
    // Set loading state
    setLoading(true);

    // Step 1: Call logout API (Requirement 10.5)
    // This invalidates the token on the server
    try {
      await authApi.logout();
    } catch (apiError) {
      // Log API error but continue with local logout
      // Token might already be invalid, which is fine
      console.warn('Logout API call failed:', apiError);
    }

    // Step 2: Clear all stored session data (Requirement 10.6)
    await secureStorage.clearAll();

    // Step 3: Update auth store to logged out state
    logout();

    // Navigation to Auth_Navigator handled by RootNavigator (Requirement 10.7)
    return {
      success: true,
    };
  } catch (error) {
    // Even on error, try to clear local data for security
    try {
      await secureStorage.clearAll();
      logout();
    } catch {
      // Ignore cleanup errors
    }

    // Handle unexpected errors
    if (error instanceof AxiosError) {
      return {
        success: false,
        error: 'Erro ao fazer logout. Sessão encerrada localmente.',
      };
    }

    return {
      success: false,
      error: 'Erro inesperado ao fazer logout.',
    };
  } finally {
    setLoading(false);
  }
};

export default logoutUseCase;
