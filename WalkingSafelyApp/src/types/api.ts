/**
 * API Types
 * Type definitions for API requests, responses, and error handling
 */

/**
 * API error response structure
 */
export interface ApiError {
  code: string;
  translationKey: string;
  message: string;
  params?: Record<string, string>;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Authentication login request
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Authentication login response
 */
export interface LoginResponse {
  token: string;
  user: import('./models').User;
  expiresAt: string;
}

/**
 * User registration request
 */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  locale?: string;
}

/**
 * User registration response
 */
export interface RegisterResponse {
  token: string;
  user: import('./models').User;
}

/**
 * Geocoding search request
 */
export interface GeocodeRequest {
  query: string;
  limit?: number;
  bounds?: import('./models').MapBounds;
}

/**
 * Geocoding search response
 */
export interface GeocodeResponse {
  results: import('./models').Address[];
}

/**
 * Reverse geocoding request
 */
export interface ReverseGeocodeRequest {
  coordinates: import('./models').Coordinates;
}

/**
 * Reverse geocoding response
 */
export interface ReverseGeocodeResponse {
  address: import('./models').Address;
}

/**
 * Heatmap data request
 */
export interface HeatmapRequest {
  bounds: import('./models').MapBounds;
  filters?: import('./models').HeatmapFilters;
}

/**
 * Heatmap data response
 */
export interface HeatmapResponse {
  points: import('./models').HeatmapPoint[];
  lastUpdated: string;
}

/**
 * Alert preferences update request
 */
export interface UpdateAlertPreferencesRequest {
  enabled?: boolean;
  soundEnabled?: boolean;
  types?: string[];
  schedule?: import('./models').AlertSchedule | null;
}

/**
 * Alert preferences response
 */
export interface AlertPreferencesResponse {
  preferences: import('./models').AlertPreferences;
}

/**
 * Occurrence list request parameters
 */
export interface ListOccurrencesRequest {
  bounds?: import('./models').MapBounds;
  crimeTypes?: string[];
  severity?: import('./models').OccurrenceSeverity[];
  startDate?: string;
  endDate?: string;
  page?: number;
  perPage?: number;
}

/**
 * Create occurrence response
 */
export interface CreateOccurrenceResponse {
  occurrence: import('./models').Occurrence;
  remainingReports: number;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetsAt: string;
}

/**
 * Traffic update check response
 */
export interface TrafficUpdateResponse {
  hasUpdate: boolean;
  alternativeRoute?: import('./models').RouteResponse;
  timeSaved?: number;
  riskChange?: number;
}

/**
 * API request configuration
 */
export interface ApiRequestConfig {
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
