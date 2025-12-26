/**
 * Alerts API Service
 * Handles alert preferences retrieval and updates
 */

import {apiClient} from './client';
import {
  UpdateAlertPreferencesRequest,
  AlertPreferencesResponse,
} from '../../types/api';
import {AlertPreferences} from '../../types/models';

/**
 * Alerts service interface
 */
export interface AlertsApiService {
  getPreferences(): Promise<AlertPreferences>;
  updatePreferences(
    preferences: UpdateAlertPreferencesRequest,
  ): Promise<AlertPreferences>;
}

/**
 * Alerts API endpoints
 */
const ALERTS_ENDPOINTS = {
  PREFERENCES: '/alerts/preferences',
} as const;

/**
 * Alerts API service implementation
 */
export const alertsApiService: AlertsApiService = {
  /**
   * Get current user's alert preferences
   */
  async getPreferences(): Promise<AlertPreferences> {
    const response = await apiClient.get<AlertPreferencesResponse>(
      ALERTS_ENDPOINTS.PREFERENCES,
    );
    return response.preferences;
  },

  /**
   * Update user's alert preferences
   */
  async updatePreferences(
    preferences: UpdateAlertPreferencesRequest,
  ): Promise<AlertPreferences> {
    const response = await apiClient.put<AlertPreferencesResponse>(
      ALERTS_ENDPOINTS.PREFERENCES,
      preferences,
    );
    return response.preferences;
  },
};

export default alertsApiService;
