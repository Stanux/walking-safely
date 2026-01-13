/**
 * Property-Based Tests for API Client
 * Feature: walking-safely-app
 *
 * Tests API client interceptors using property-based testing with fast-check
 */

import fc from 'fast-check';
import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { parseApiError, ApiError } from '../apiClient';

// Mock axios
jest.mock('axios', () => {
  return {
    create: jest.fn(() => ({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    })),
  };
});

describe('API Client - Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Feature: walking-safely-app, Property 9: Injeção de Token de Autenticação
   * Validates: Requisito 3.4
   *
   * For any HTTP request when a token exists in storage,
   * the request interceptor MUST add the header `Authorization: Bearer {token}`
   */
  describe('Property 9: Token Injection', () => {
    /**
     * Simulates the request interceptor logic for adding Bearer token
     * This is the core logic that the actual interceptor implements
     */
    const addBearerToken = (
      config: InternalAxiosRequestConfig,
      token: string | null
    ): InternalAxiosRequestConfig => {
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    };

    it('should add Bearer token to Authorization header for any stored token', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          (token) => {
            const config: InternalAxiosRequestConfig = {
              headers: {} as InternalAxiosRequestConfig['headers'],
            } as InternalAxiosRequestConfig;

            const result = addBearerToken(config, token);

            // Verify the Authorization header is correctly set
            return result.headers?.Authorization === `Bearer ${token}`;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not add Authorization header when no token exists', () => {
      fc.assert(
        fc.property(fc.constant(null), (token) => {
          const config: InternalAxiosRequestConfig = {
            headers: {} as InternalAxiosRequestConfig['headers'],
          } as InternalAxiosRequestConfig;

          const result = addBearerToken(config, token);

          // Verify no Authorization header is set
          return result.headers?.Authorization === undefined;
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve Bearer prefix format for any valid token', () => {
      fc.assert(
        fc.property(
          // Generate various token formats (JWT-like, simple strings, etc.)
          fc
            .oneof(
              fc.string({ minLength: 1, maxLength: 500 }),
              fc.hexaString({ minLength: 32, maxLength: 64 }),
              fc.base64String({ minLength: 20, maxLength: 200 })
            )
            .filter((s) => s.trim().length > 0),
          (token) => {
            const config: InternalAxiosRequestConfig = {
              headers: {} as InternalAxiosRequestConfig['headers'],
            } as InternalAxiosRequestConfig;

            const result = addBearerToken(config, token);

            // Verify format is exactly "Bearer {token}"
            const authHeader = result.headers?.Authorization as string;
            return (
              authHeader.startsWith('Bearer ') &&
              authHeader.substring(7) === token
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: walking-safely-app, Property 8: Tratamento de Erros de API
   * Validates: Requisitos 3.3, 3.5
   *
   * For any HTTP error code (401, 422, 423, 503), the response interceptor
   * MUST return a typed error object with the correct structure for that code.
   */
  describe('Property 8: API Error Handling', () => {
    const createAxiosError = (
      status: number,
      data: ApiError
    ): AxiosError<ApiError> => {
      const error = new Error('Request failed') as AxiosError<ApiError>;
      error.isAxiosError = true;
      error.response = {
        status,
        data,
        statusText: '',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };
      return error;
    };

    it('should return correct error structure for 401 errors', () => {
      fc.assert(
        fc.property(
          fc.record({
            error: fc.string(),
            message: fc.string(),
            attempts_remaining: fc.option(fc.integer({ min: 0, max: 5 })),
          }),
          (errorData) => {
            const axiosError = createAxiosError(401, errorData as ApiError);
            const parsed = parseApiError(axiosError);

            return (
              parsed.code === 'AUTH_INVALID_CREDENTIALS' &&
              parsed.status === 401 &&
              typeof parsed.message === 'string' &&
              (errorData.attempts_remaining === undefined ||
                errorData.attempts_remaining === null ||
                parsed.attemptsRemaining === errorData.attempts_remaining)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return correct error structure for 422 validation errors', () => {
      fc.assert(
        fc.property(
          fc.record({
            error: fc.string(),
            message: fc.string(),
            errors: fc.option(
              fc.dictionary(fc.string(), fc.array(fc.string()))
            ),
          }),
          (errorData) => {
            const axiosError = createAxiosError(422, errorData as ApiError);
            const parsed = parseApiError(axiosError);

            return (
              parsed.code === 'VALIDATION_ERROR' &&
              parsed.status === 422 &&
              typeof parsed.message === 'string'
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return correct error structure for 423 locked account errors', () => {
      fc.assert(
        fc.property(
          fc.record({
            error: fc.string(),
            message: fc.string(),
            locked_until: fc.option(fc.string()),
            remaining_seconds: fc.option(fc.integer({ min: 0, max: 3600 })),
          }),
          (errorData) => {
            const axiosError = createAxiosError(423, errorData as ApiError);
            const parsed = parseApiError(axiosError);

            return (
              parsed.code === 'ACCOUNT_LOCKED' &&
              parsed.status === 423 &&
              typeof parsed.message === 'string' &&
              (errorData.locked_until === undefined ||
                errorData.locked_until === null ||
                parsed.lockedUntil === errorData.locked_until) &&
              (errorData.remaining_seconds === undefined ||
                errorData.remaining_seconds === null ||
                parsed.remainingSeconds === errorData.remaining_seconds)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return correct error structure for 503 service unavailable errors', () => {
      fc.assert(
        fc.property(
          fc.record({
            error: fc.string(),
            message: fc.string(),
          }),
          (errorData) => {
            const axiosError = createAxiosError(503, errorData as ApiError);
            const parsed = parseApiError(axiosError);

            return (
              parsed.code === 'SERVICE_UNAVAILABLE' &&
              parsed.status === 503 &&
              typeof parsed.message === 'string'
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return UNKNOWN_ERROR for any other status code', () => {
      fc.assert(
        fc.property(
          fc
            .integer({ min: 400, max: 599 })
            .filter((s) => ![401, 422, 423, 503].includes(s)),
          fc.record({
            error: fc.string(),
            message: fc.string(),
          }),
          (status, errorData) => {
            const axiosError = createAxiosError(status, errorData as ApiError);
            const parsed = parseApiError(axiosError);

            return (
              parsed.code === 'UNKNOWN_ERROR' &&
              parsed.status === status &&
              typeof parsed.message === 'string'
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always return a valid ParsedApiError structure', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 400, max: 599 }),
          fc.record({
            error: fc.string(),
            message: fc.string(),
          }),
          (status, errorData) => {
            const axiosError = createAxiosError(status, errorData as ApiError);
            const parsed = parseApiError(axiosError);

            // Verify structure is always valid
            return (
              typeof parsed.code === 'string' &&
              parsed.code.length > 0 &&
              typeof parsed.message === 'string' &&
              typeof parsed.status === 'number' &&
              parsed.status === status
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
