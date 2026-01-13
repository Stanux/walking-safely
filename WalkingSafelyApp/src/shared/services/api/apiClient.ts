/**
 * API Client
 * Centralized HTTP client using Axios for communication with Walking Safely API
 *
 * @module shared/services/api/apiClient
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { getToken, clearToken } from '../storage/secureStorage';
import { API_BASE_URL, API_TIMEOUT } from '../../config/api.config';

/**
 * API error response structure from backend
 */
export interface ApiError {
  error: string;
  message: string;
  attempts_remaining?: number;
  locked_until?: string;
  remaining_seconds?: number;
  errors?: Record<string, string[]>;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  token?: string;
  token_type?: string;
}

/**
 * Parsed error structure for application use
 */
export interface ParsedApiError {
  code: string;
  message: string;
  status: number;
  attemptsRemaining?: number;
  lockedUntil?: string;
  remainingSeconds?: number;
  validationErrors?: Record<string, string[]>;
}

// Event emitter for auth state changes (logout on 401)
type AuthEventCallback = () => void;
let onUnauthorizedCallback: AuthEventCallback | null = null;

/**
 * Register callback for unauthorized (401) events
 * @param callback - Function to call when 401 is received
 */
export const onUnauthorized = (callback: AuthEventCallback): void => {
  onUnauthorizedCallback = callback;
};

/**
 * Parse API error response into standardized format
 * @param error - Axios error object
 * @returns Parsed error with standardized structure
 */
export const parseApiError = (error: AxiosError<ApiError>): ParsedApiError => {
  const status = error.response?.status ?? 0;
  const data = error.response?.data;

  switch (status) {
    case 401:
      return {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: data?.message ?? 'Credenciais inválidas',
        status,
        attemptsRemaining: data?.attempts_remaining,
      };

    case 422:
      return {
        code: 'VALIDATION_ERROR',
        message: data?.message ?? 'Erro de validação',
        status,
        validationErrors: data?.errors,
      };

    case 423:
      return {
        code: 'ACCOUNT_LOCKED',
        message: data?.message ?? 'Conta bloqueada temporariamente',
        status,
        lockedUntil: data?.locked_until,
        remainingSeconds: data?.remaining_seconds,
      };

    case 503:
      return {
        code: 'SERVICE_UNAVAILABLE',
        message: data?.message ?? 'Serviço temporariamente indisponível',
        status,
      };

    default:
      return {
        code: 'UNKNOWN_ERROR',
        message: data?.message ?? 'Ocorreu um erro inesperado',
        status,
      };
  }
};

/**
 * Create and configure Axios instance with interceptors
 * @returns Configured Axios instance
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Request interceptor - adds Bearer Token to Authorization header
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const token = await getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handles errors consistently
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError<ApiError>) => {
      const status = error.response?.status;

      // Handle 401 - clear token and trigger unauthorized callback
      if (status === 401) {
        await clearToken();
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }
      }

      // Parse and reject with standardized error
      const parsedError = parseApiError(error);
      return Promise.reject(parsedError);
    }
  );

  return client;
};

/**
 * Singleton API client instance
 */
export const apiClient = createApiClient();

/**
 * Helper to check if an error is a ParsedApiError
 * @param error - Error to check
 * @returns True if error is a ParsedApiError
 */
export const isParsedApiError = (error: unknown): error is ParsedApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'status' in error
  );
};
