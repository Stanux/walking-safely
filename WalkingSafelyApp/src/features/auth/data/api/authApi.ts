/**
 * Auth API Service
 * Handles all authentication-related API calls to the Walking Safely backend
 *
 * @module features/auth/data/api/authApi
 */

import { apiClient } from '@/shared/services/api/apiClient';

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Request payload for user login
 */
export interface LoginRequest {
  email: string;
  password: string;
  revoke_existing?: boolean;
}

/**
 * Request payload for user registration
 */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  locale?: 'pt_BR' | 'en' | 'es';
}

/**
 * Request payload for password recovery
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * User entity returned from API
 */
export interface User {
  id: number;
  name: string;
  email: string;
  locale: 'pt_BR' | 'en' | 'es';
  created_at: string;
  updated_at?: string;
}

/**
 * Authentication response from login/register endpoints
 */
export interface AuthResponse {
  data: User;
  token: string;
  token_type: string;
  message: string;
}

/**
 * API error response structure
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
 * Simple message response
 */
export interface MessageResponse {
  message: string;
}

/**
 * User data response
 */
export interface UserResponse {
  data: User;
}

// ============================================================================
// Auth API Service
// ============================================================================

/**
 * Authentication API service
 * Provides methods for all auth-related API operations
 */
export const authApi = {
  /**
   * Authenticate user with email and password
   * @param data - Login credentials
   * @returns Authentication response with user data and token
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  /**
   * Register a new user account
   * @param data - Registration data
   * @returns Authentication response with user data and token
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Request password reset email
   * @param data - Email for password recovery
   * @returns Success message
   */
  forgotPassword: async (data: ForgotPasswordRequest): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>('/auth/forgot-password', data);
    return response.data;
  },

  /**
   * Logout current user and invalidate token
   * @returns Success message
   */
  logout: async (): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>('/auth/logout');
    return response.data;
  },

  /**
   * Get current authenticated user data
   * @returns User data
   */
  me: async (): Promise<UserResponse> => {
    const response = await apiClient.get<UserResponse>('/auth/me');
    return response.data;
  },
};

export default authApi;
