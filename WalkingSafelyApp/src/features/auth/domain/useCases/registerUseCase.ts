/**
 * Register Use Case
 * Handles the registration flow: validate data, call API, store token, update store
 *
 * Requirements: 8.7, 8.8, 8.9, 8.10
 * - 8.7: WHEN user submits valid data, consume POST /auth/register
 * - 8.8: WHEN registration succeeds, store Bearer_Token securely
 * - 8.9: WHEN registration succeeds, navigate to App_Navigator
 * - 8.10: WHEN registration fails with 422, show validation messages per field
 *
 * @module features/auth/domain/useCases/registerUseCase
 */

import { AxiosError } from 'axios';
import { authApi, ApiError, User } from '../../data/api/authApi';
import { validateRegisterForm } from '../validators/authValidators';
import { secureStorage } from '@/shared/services/storage/secureStorage';
import { useAuthStore } from '../../store/authStore';

// ============================================================================
// Types
// ============================================================================

export type Locale = 'pt_BR' | 'en' | 'es';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  locale?: Locale;
}

export interface RegisterResult {
  success: boolean;
  user?: User;
  error?: string;
  validationErrors?: {
    name?: string;
    email?: string;
    password?: string;
    passwordConfirmation?: string;
  };
  fieldErrors?: Record<string, string[]>;
}

// ============================================================================
// Use Case
// ============================================================================

/**
 * Execute register use case
 *
 * Flow:
 * 1. Validate input data locally
 * 2. Call register API
 * 3. On success: store token securely, update auth store
 * 4. On failure: parse error and return appropriate error info
 *
 * @param input - Registration data
 * @returns Register result with success status and user data or error info
 */
export const registerUseCase = async (input: RegisterInput): Promise<RegisterResult> => {
  const { setLoading, setError, login } = useAuthStore.getState();

  // Step 1: Validate input locally
  const validation = validateRegisterForm(
    input.name,
    input.email,
    input.password,
    input.passwordConfirmation
  );

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

    // Step 2: Call register API (Requirement 8.7)
    const response = await authApi.register({
      name: input.name.trim(),
      email: input.email.trim(),
      password: input.password,
      password_confirmation: input.passwordConfirmation,
      locale: input.locale || 'pt_BR',
    });

    // Step 3: Store token securely (Requirement 8.8)
    await secureStorage.setToken(response.token);
    await secureStorage.setUser(response.data);

    // Step 4: Update auth store
    login(response.data, response.token);

    // Success - navigation to App_Navigator handled by RootNavigator (Requirement 8.9)
    return {
      success: true,
      user: response.data,
    };
  } catch (error) {
    // Handle API errors
    if (error instanceof AxiosError && error.response) {
      const status = error.response.status;
      const data = error.response.data as ApiError;

      // Requirement 8.10: Handle 422 - Validation errors
      if (status === 422) {
        const errorMessage = data.message || 'Erro de validação';
        setError(errorMessage);

        return {
          success: false,
          error: errorMessage,
          fieldErrors: data.errors,
        };
      }

      // Handle other API errors
      const errorMessage = data.message || 'Erro ao criar conta';
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

export default registerUseCase;
