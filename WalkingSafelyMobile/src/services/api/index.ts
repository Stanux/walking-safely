/**
 * API Services Exports
 * Central export point for all API services
 */

// Client
export {
  apiClient,
  setAuthToken,
  getAuthToken,
  getAxiosInstance,
  type ApiClient,
} from './client';

// Auth Service
export {authService, type AuthService} from './auth';

// Routes Service
export {routesService, type RoutesService} from './routes';

// Occurrences Service
export {occurrencesService, type OccurrencesService} from './occurrences';

// Geocoding Service
export {geocodingService, type GeocodingService} from './geocoding';

// Heatmap Service
export {heatmapService, type HeatmapService} from './heatmap';

// Alerts Service
export {alertsApiService, type AlertsApiService} from './alerts';
