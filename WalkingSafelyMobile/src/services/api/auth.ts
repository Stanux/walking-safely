/**
 * Authentication API Service
 * Handles login, logout, and registration
 */

import {apiClient, setAuthToken} from './client';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from '../../types/api';
import {User} from '../../types/models';

/**
 * Authentication service interface
 */
export interface AuthService {
  login(email: string, password: string): Promise<LoginResponse>;
  logout(): Promise<void>;
  register(data: RegisterRequest): Promise<RegisterResponse>;
  getCurrentUser(): Promise<User>;
  refreshToken(): Promise<LoginResponse>;
}

/**
 * Authentication API endpoints
 */
const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REGISTER: '/auth/register',
  ME: '/auth/me',
  REFRESH: '/auth/refresh',
} as const;

/**
 * Authentication service implementation
 */
export const authService: AuthService = {
  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const request: LoginRequest = {email, password};
    const response = await apiClient.post<LoginResponse>(
      AUTH_ENDPOINTS.LOGIN,
      request,
    );

    // Set the token for subsequent requests
    setAuthToken(response.token);

    return response;
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post(AUTH_ENDPOINTS.LOGOUT);
    } finally {
      // Always clear the token, even if the request fails
      setAuthToken(null);
    }
  },

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>(
      AUTH_ENDPOINTS.REGISTER,
      data,
    );

    // Set the token for subsequent requests
    setAuthToken(response.token);

    return response;
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>(AUTH_ENDPOINTS.ME);
  },

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      AUTH_ENDPOINTS.REFRESH,
    );

    // Update the token
    setAuthToken(response.token);

    return response;
  },
};

export default authService;
