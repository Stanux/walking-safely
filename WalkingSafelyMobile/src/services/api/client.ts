/**
 * API Client
 * Base HTTP client with Axios, interceptors for auth, locale, and error handling
 * Implements retry with exponential backoff
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import {getLocale} from '../../i18n';
import {
  API_BASE_URL,
  API_TIMEOUT,
  MAX_RETRY_ATTEMPTS,
} from '../../utils/constants';
import {ApiError} from '../../types/api';

// Token storage - will be set by auth store
let authToken: string | null = null;

/**
 * Set the authentication token for API requests
 */
export const setAuthToken = (token: string | null): void => {
  authToken = token;
};

/**
 * Get the current authentication token
 */
export const getAuthToken = (): string | null => {
  return authToken;
};

/**
 * Extended request config with retry metadata
 */
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _skipRetry?: boolean;
}

/**
 * Calculate delay for exponential backoff
 * @param retryCount - Current retry attempt (0-indexed)
 * @returns Delay in milliseconds (1s, 2s, 4s)
 */
const calculateBackoffDelay = (retryCount: number): number => {
  return Math.pow(2, retryCount) * 1000;
};

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Check if error is retryable (network errors, 5xx server errors)
 */
const isRetryableError = (error: AxiosError): boolean => {
  // Network errors (no response)
  if (!error.response) {
    return true;
  }

  // Server errors (5xx)
  const status = error.response.status;
  return status >= 500 && status < 600;
};

/**
 * Transform API error to standardized format
 */
const transformError = (error: AxiosError): ApiError => {
  if (error.response?.data) {
    const data = error.response.data as Partial<ApiError>;
    return {
      code: data.code || `HTTP_${error.response.status}`,
      translationKey: data.translationKey || 'errors.unknown',
      message: data.message || error.message,
      params: data.params,
    };
  }

  // Network error
  if (!error.response) {
    return {
      code: 'NETWORK_ERROR',
      translationKey: 'errors.network',
      message: 'Network error. Please check your connection.',
    };
  }

  // Default error
  return {
    code: `HTTP_${error.response.status}`,
    translationKey: 'errors.unknown',
    message: error.message,
  };
};

/**
 * Create the Axios instance with base configuration
 */
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Request interceptor - add auth token and Accept-Language header
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Add Accept-Language header with current locale
      const locale = getLocale();
      config.headers['Accept-Language'] = locale;

      // Add Authorization header if token exists
      if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    },
  );

  // Response interceptor - handle errors and retry logic
  instance.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      const config = error.config as ExtendedAxiosRequestConfig | undefined;

      // If no config or retry is skipped, reject immediately
      if (!config || config._skipRetry) {
        return Promise.reject(transformError(error));
      }

      // Initialize retry count
      config._retryCount = config._retryCount ?? 0;

      // Check if we should retry
      if (isRetryableError(error) && config._retryCount < MAX_RETRY_ATTEMPTS) {
        config._retryCount += 1;

        // Calculate backoff delay
        const delay = calculateBackoffDelay(config._retryCount - 1);

        // Wait before retrying
        await sleep(delay);

        // Retry the request
        return instance.request(config);
      }

      // Max retries reached or non-retryable error
      return Promise.reject(transformError(error));
    },
  );

  return instance;
};

// Create singleton instance
const axiosInstance = createAxiosInstance();

/**
 * API Client interface
 */
export interface ApiClient {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T>;
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

/**
 * API Client with typed methods
 */
export const apiClient: ApiClient = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.get<T>(url, config);
    return response.data;
  },

  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await axiosInstance.post<T>(url, data, config);
    return response.data;
  },

  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await axiosInstance.put<T>(url, data, config);
    return response.data;
  },

  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await axiosInstance.patch<T>(url, data, config);
    return response.data;
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.delete<T>(url, config);
    return response.data;
  },
};

/**
 * Get the raw Axios instance for advanced use cases
 */
export const getAxiosInstance = (): AxiosInstance => axiosInstance;

export default apiClient;
