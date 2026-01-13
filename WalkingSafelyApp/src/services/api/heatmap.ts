/**
 * Heatmap Service
 * API service for heatmap data
 */

import {HeatmapPoint, MapBounds, HeatmapFilters} from '../../types/models';

export interface HeatmapService {
  getHeatmapData(bounds: MapBounds, filters?: HeatmapFilters): Promise<HeatmapPoint[]>;
}

/**
 * Heatmap service implementation
 */
export const heatmapService: HeatmapService = {
  /**
   * Get heatmap data for the given bounds
   */
  async getHeatmapData(bounds: MapBounds, _filters?: HeatmapFilters): Promise<HeatmapPoint[]> {
    // TODO: Implement actual API call
    // For now, return empty array
    console.log('[HeatmapService] getHeatmapData called with bounds:', bounds);
    return [];
  },
};
