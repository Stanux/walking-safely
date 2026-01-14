/**
 * Application Constants
 */

// API Configuration
export const API_BASE_URL = 'http://50.21.181.92:8080/api';

// Debug log
console.log('[Constants] API_BASE_URL loaded:', API_BASE_URL);

// Timeouts
export const API_TIMEOUT = 60000; // 60 seconds (increased for long-distance route calculations)
export const LOCATION_TIMEOUT = 15000; // 15 seconds
export const DEBOUNCE_DELAY = 500; // 500ms for search

// Limits
export const MAX_SEARCH_RESULTS = 5;
export const MIN_SEARCH_RESULTS = 5; // Requirement 6.3: Display at least 5 results when available
export const MAX_REPORTS_PER_HOUR = 5;
export const MAX_RETRY_ATTEMPTS = 3;

// Risk Thresholds
export const RISK_WARNING_THRESHOLD = 50;
export const RISK_HIGH_THRESHOLD = 70;

// Alert Distances (meters)
export const MIN_ALERT_DISTANCE = 200;
export const HIGH_SPEED_ALERT_DISTANCE = 500;
export const HIGH_SPEED_THRESHOLD = 40; // km/h

// Navigation
export const TRAFFIC_UPDATE_INTERVAL = 60000; // 60 seconds
export const POSITION_UPDATE_DISTANCE = 10; // meters

// Default Location (São Paulo)
export const DEFAULT_LOCATION = {
  latitude: -23.5505,
  longitude: -46.6333,
};

// HERE Maps API Key
export const HERE_MAPS_API_KEY = 'ls2nx6XF4A5vrevvMIoiqoDyS1pVNknJRjvd8jKOMiM';

// Supported Locales
export const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es'] as const;
export const DEFAULT_LOCALE = 'pt-BR';
