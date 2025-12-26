/**
 * Heatmap API Service
 * Handles heatmap data retrieval with cancellation support
 * Requirements: 9.6, 15.4
 */

import {apiClient} from './client';
import {HeatmapRequest, HeatmapResponse} from '../../types/api';
import {MapBounds, HeatmapPoint, HeatmapFilters} from '../../types/models';

/**
 * Abort controller for cancelling pending requests
 */
let currentAbortController: AbortController | null = null;

/**
 * Heatmap service interface
 */
export interface HeatmapService {
  getData(
    bounds: MapBounds,
    filters?: HeatmapFilters,
  ): Promise<HeatmapResponse>;
  getPoints(
    bounds: MapBounds,
    filters?: HeatmapFilters,
  ): Promise<HeatmapPoint[]>;
  cancelPendingRequest(): void;
}

/**
 * Heatmap API endpoints
 */
const HEATMAP_ENDPOINTS = {
  DATA: '/heatmap',
} as const;

/**
 * Heatmap service implementation
 */
export const heatmapService: HeatmapService = {
  /**
   * Get heatmap data for a given map bounds and optional filters
   * Automatically cancels any pending request before making a new one
   * Requirement 15.4: Optimize heatmap requests with cancellation
   */
  async getData(
    bounds: MapBounds,
    filters?: HeatmapFilters,
  ): Promise<HeatmapResponse> {
    // Cancel any pending request
    this.cancelPendingRequest();

    // Create new abort controller for this request
    currentAbortController = new AbortController();

    const request: HeatmapRequest = {
      bounds,
      filters,
    };

    try {
      const response = await apiClient.post<HeatmapResponse>(
        HEATMAP_ENDPOINTS.DATA,
        request,
        {signal: currentAbortController.signal},
      );
      return response;
    } catch (error) {
      // Re-throw if not an abort error
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, return empty response
        return {points: [], lastUpdated: new Date().toISOString()};
      }
      throw error;
    } finally {
      currentAbortController = null;
    }
  },

  /**
   * Get only heatmap points (convenience method)
   */
  async getPoints(
    bounds: MapBounds,
    filters?: HeatmapFilters,
  ): Promise<HeatmapPoint[]> {
    const response = await this.getData(bounds, filters);
    return response.points;
  },

  /**
   * Cancel any pending heatmap request
   * Requirement 15.4: Cancel pending requests when zoom changes
   */
  cancelPendingRequest(): void {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
  },
};

export default heatmapService;
