/**
 * API Configuration
 * Centralized configuration for API endpoints
 *
 * @module shared/config/api.config
 */

// Production API URL
const API_URL = 'http://50.21.181.92:8080/api';

/**
 * API base URL
 */
export const API_BASE_URL = API_URL;

/**
 * API timeout in milliseconds
 * Increased to 120s to support very long-distance route calculations (e.g., 600km+)
 * The backend may need extra time to calculate alternative routes and risk analysis
 */
export const API_TIMEOUT = 120000;
