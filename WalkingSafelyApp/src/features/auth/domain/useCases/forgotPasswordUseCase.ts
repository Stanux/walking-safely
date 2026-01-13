/**
 * Forgot Password Use Case
 * Handles the password recovery flow: validate email, call API, return result
 *
 * Requirements: 9.3, 9.4, 9.5
 * - 9.3: WHEN user submits valid email, consume POST /auth/forgot-password
 * - 9.4: WHEN request succeeds, show email sent confirmation message
 * - 9.5: WHEN email doesn't exist, show generic success message (for security)
 *
 * @module features/auth/domain/useCases/forgotPasswordUseCase
 */

import { AxiosError } from 'axios';
import { authApi, ApiError } from '../../data/api/authApi';
import { validateEmail } from '../validators/authValidators';
import { useAuthStore } from '../../store/authStore';

// ============================================================================
// Types
// ============================================================================

export interface ForgotPasswordInput {
  email: string;
}

export interface ForgotPasswordResult {
  success: boolean;
  message?: string;
  error?: string;
  validationErrors?: {
    email?: string;
  };
}

// ============================================================================
// Use Case
// ============================================================================

/**
 * Execute forgot password use case
 *
 * Flow:
 * 1. Validate email locally
 * 2. Call forgot password API
 * 3. Return success message (always shows success for security - Requirement 9.5)
 *
 * @param input - Email for password recovery
 * @returns Result with success status and message
 */
export const forgotPasswordUseCase = async (
  input: ForgotPasswordInput
): Promise<ForgotPasswordResult> => {
  const { setLoading, setError } = useAuthStore.getState();

  // Step 1: Validate email locally
  const validation = validateEmail(input.email);

  if (!validation.isValid) {
    return {
      success: false,
      validationErrors: {
        email: validation.error,
      },
    };
  }

  try {
    // Set loading state
    setLoading(true);
    setError(null);

    // Step 2: Call forgot password API (Requirement 9.3)
    const response = await authApi.forgotPassword({
      email: input.email.trim(),
    });

    // Step 3: Return success message (Requirement 9.4)
    return {
      success: true,
      message:
        response.message ||
        'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.',
    };
  } catch (error) {
    // Handle API errors
    if (error instanceof AxiosError && error.response) {
      const status = error.response.status;
      const data = error.response.data as ApiError;

      // Requirement 9.5: For security, show generic success even if email not found
      // Most APIs return 200 even for non-existent emails, but handle 404 gracefully
      if (status === 404) {
        return {
          success: true,
          message:
            'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.',
        };
      }

      // Handle validation errors (422)
      if (status === 422) {
        return {
          success: false,
          error: data.message || 'Email inválido',
          validationErrors: {
            email: data.errors?.email?.[0],
          },
        };
      }

      // Handle other API errors
      const errorMessage = data.message || 'Erro ao solicitar recuperação de senha';
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

export default forgotPasswordUseCase;
