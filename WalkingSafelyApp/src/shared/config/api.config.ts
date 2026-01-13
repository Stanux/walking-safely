/**
 * API Configuration
 * Centralized configuration for API endpoints
 *
 * @module shared/config/api.config
 */

// For development, use the local network IP of the server
// TODO: In production, change this to the production API URL
const API_URL = 'http://192.168.15.3:8080/api';

/**
 * API base URL
 */
export const API_BASE_URL = API_URL;

/**
 * API timeout in milliseconds
 */
export const API_TIMEOUT = 10000;
