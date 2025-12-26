/**
 * Services Exports
 * Central export point for all services
 */

// API Services
export {
  apiClient,
  setAuthToken,
  getAuthToken,
  getAxiosInstance,
  authService,
  routesService,
  occurrencesService,
  geocodingService,
  heatmapService,
  alertsApiService,
} from './api';

// Location Service
export {
  locationService,
  DEFAULT_LOCATION,
  type LocationService,
  type LocationPermissionStatus,
  type LocationError,
  type LocationErrorType,
  type Position,
  type GetPositionOptions,
  type WatchPositionOptions,
  type PositionCallback,
  type PositionErrorCallback,
} from './location';

// Alert Service
export {
  alertService,
  calculateDistance,
  type AlertService,
  type AlertServiceConfig,
  type AlertCheckResult,
  type HighRiskRegion,
} from './alerts';

// Cache Service
export {
  cacheService,
  CACHE_KEYS,
  type CacheService,
  type CacheConfig,
  type CacheEntry,
  type TaxonomyData,
} from './cache';

// Network Service
export {
  networkService,
  type NetworkService,
  type NetworkState,
  type NetworkStatus,
  type NetworkChangeCallback,
} from './network';

// Background Service
export {backgroundService, type BackgroundService} from './background';
