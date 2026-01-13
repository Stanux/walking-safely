/**
 * Login Use Case
 * Handles the login flow: validate data, call API, store token, update store
 *
 * Requirements: 7.4, 7.5, 7.6, 7.7, 7.8
 * - 7.4: WHEN user submits valid credentials, consume POST /auth/login
 * - 7.5: WHEN authentication succeeds, store Bearer_Token securely
 * - 7.6: WHEN authentication succeeds, navigate to App_Navigator
 * - 7.7: WHEN authentication fails with 401, show invalid credentials message with remaining attempts
 * - 7.8: WHEN account is locked (423), show remaining lock time
 *
 * @module features/auth/domain/useCases/loginUseCase
 */

import { AxiosError } from 'axios';
import { authApi, ApiError, User } from '../../data/api/authApi';
import { validateLoginForm } from '../validators/authValidators';
import { secureStorage } from '@/shared/services/storage/secureStorage';
import { useAuthStore } from '../../store/authStore';

// ============================================================================
// Types
// ============================================================================

export interface LoginInput {
  email: string;
  password: string;
  revokeExisting?: boolean;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
  validationErrors?: {
    email?: string;
    password?: string;
  };
  attemptsRemaining?: number;
  lockedUntil?: string;
  remainingSeconds?: number;
}

// ============================================================================
// Use Case
// ============================================================================

/**
 * Execute login use case
 *
 * Flow:
 * 1. Validate input data locally
 * 2. Call login API
 * 3. On success: store token securely, update auth store
 * 4. On failure: parse error and return appropriate error info
 *
 * @param input - Login credentials
 * @returns Login result with success status and user data or error info
 */
export const loginUseCase = async (input: LoginInput): Promise<LoginResult> => {
  const { setLoading, setError, setLockInfo, login } = useAuthStore.getState();

  // Step 1: Validate input locally
  const validation = validateLoginForm(input.email, input.password);

  if (!validation.isValid) {
    return {
      success: false,
      validationErrors: validation.errors,
    };
  }

  try {
    // Set loading state
    setLoading(true);
    setError(null);

    // Step 2: Call login API (Requirement 7.4)
    const response = await authApi.login({
      email: input.email.trim(),
      password: input.password,
      revoke_existing: input.revokeExisting,
    });

    // Step 3: Store token securely (Requirement 7.5)
    await secureStorage.setToken(response.token);
    await secureStorage.setUser(response.data);

    // Step 4: Update auth store
    login(response.data, response.token);

    // Success - navigation to App_Navigator handled by RootNavigator (Requirement 7.6)
    return {
      success: true,
      user: response.data,
    };
  } catch (error) {
    // Handle API errors
    if (error instanceof AxiosError && error.response) {
      const status = error.response.status;
      const data = error.response.data as ApiError;

      // Requirement 7.7: Handle 401 - Invalid credentials
      if (status === 401) {
        const errorMessage = data.message || 'Credenciais inválidas';
        setError(errorMessage);
        setLockInfo(data.attempts_remaining ?? null, null);

        return {
          success: false,
          error: errorMessage,
          attemptsRemaining: data.attempts_remaining,
        };
      }

      // Requirement 7.8: Handle 423 - Account locked
      if (status === 423) {
        const errorMessage = data.message || 'Conta bloqueada temporariamente';
        setError(errorMessage);
        setLockInfo(0, data.locked_until ?? null);

        return {
          success: false,
          error: errorMessage,
          lockedUntil: data.locked_until,
          remainingSeconds: data.remaining_seconds,
        };
      }

      // Handle other API errors
      const errorMessage = data.message || 'Erro ao fazer login';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }

    // Handle network or unknown errors
    const errorMessage = 'Erro de conexão. Verifique sua internet.';
    setError(errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  } finally {
    setLoading(false);
  }
};

export default loginUseCase;
