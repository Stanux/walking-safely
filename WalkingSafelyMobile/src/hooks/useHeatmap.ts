/**
 * useHeatmap Hook
 * Manages heatmap data loading with debounce and cancellation
 * Requirements: 9.6, 15.4
 */

import {useCallback, useRef, useEffect} from 'react';
import {useMapStore} from '../store/mapStore';
import {heatmapService} from '../services/api/heatmap';
import {MapBounds, HeatmapFilters} from '../types/models';
import {DEBOUNCE_DELAY} from '../utils/constants';

/**
 * Options for useHeatmap hook
 */
export interface UseHeatmapOptions {
  /** Debounce delay in milliseconds (default: 500ms) */
  debounceDelay?: number;
  /** Whether to auto-load on mount */
  autoLoad?: boolean;
}

/**
 * Return type for useHeatmap hook
 */
export interface UseHeatmapReturn {
  /** Current heatmap data points */
  heatmapData: import('../types/models').HeatmapPoint[];
  /** Whether heatmap is enabled */
  heatmapEnabled: boolean;
  /** Whether heatmap is loading */
  isLoading: boolean;
  /** Current filters */
  filters: HeatmapFilters | null;
  /** Toggle heatmap visibility */
  toggleHeatmap: () => void;
  /** Load heatmap data for bounds with debounce */
  loadHeatmapData: (bounds: MapBounds, filters?: HeatmapFilters) => void;
  /** Load heatmap data immediately without debounce */
  loadHeatmapDataImmediate: (
    bounds: MapBounds,
    filters?: HeatmapFilters,
  ) => Promise<void>;
  /** Set heatmap filters */
  setFilters: (filters: HeatmapFilters | null) => void;
  /** Cancel any pending heatmap request */
  cancelPendingRequest: () => void;
}

/**
 * Hook for managing heatmap data with debounce and cancellation
 *
 * @param options - Configuration options
 * @returns Heatmap state and control functions
 *
 * @example
 * ```tsx
 * const {
 *   heatmapData,
 *   heatmapEnabled,
 *   isLoading,
 *   loadHeatmapData,
 *   toggleHeatmap,
 * } = useHeatmap();
 *
 * // Load data when map region changes (debounced)
 * const handleRegionChange = (bounds: MapBounds) => {
 *   if (heatmapEnabled) {
 *     loadHeatmapData(bounds);
 *   }
 * };
 * ```
 */
export const useHeatmap = (
  options: UseHeatmapOptions = {},
): UseHeatmapReturn => {
  const {debounceDelay = DEBOUNCE_DELAY} = options;

  // Store state
  const {
    heatmapData,
    heatmapEnabled,
    heatmapFilters,
    isLoadingHeatmap,
    toggleHeatmap,
    loadHeatmapData: storeLoadHeatmapData,
    setHeatmapFilters,
  } = useMapStore();

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Last bounds ref for reload on filter change
  const lastBoundsRef = useRef<MapBounds | null>(null);

  /**
   * Cancel pending debounce timer
   */
  const cancelDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  /**
   * Cancel pending heatmap request
   * Requirement 15.4: Cancel pending requests
   */
  const cancelPendingRequest = useCallback(() => {
    cancelDebounce();
    heatmapService.cancelPendingRequest();
  }, [cancelDebounce]);

  /**
   * Load heatmap data immediately without debounce
   */
  const loadHeatmapDataImmediate = useCallback(
    async (bounds: MapBounds, filters?: HeatmapFilters) => {
      lastBoundsRef.current = bounds;
      await storeLoadHeatmapData(bounds, filters);
    },
    [storeLoadHeatmapData],
  );

  /**
   * Load heatmap data with debounce
   * Requirement 9.6: Request updated data when zoom changes
   * Requirement 15.4: Debounce and cancel pending requests
   */
  const loadHeatmapData = useCallback(
    (bounds: MapBounds, filters?: HeatmapFilters) => {
      // Cancel any pending debounce timer
      cancelDebounce();

      // Cancel any pending API request
      heatmapService.cancelPendingRequest();

      // Store bounds for potential reload
      lastBoundsRef.current = bounds;

      // Set up new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        storeLoadHeatmapData(bounds, filters);
      }, debounceDelay);
    },
    [cancelDebounce, storeLoadHeatmapData, debounceDelay],
  );

  /**
   * Set filters and reload data if heatmap is enabled
   */
  const setFilters = useCallback(
    (filters: HeatmapFilters | null) => {
      setHeatmapFilters(filters);

      // Reload data with new filters if heatmap is enabled and we have bounds
      if (heatmapEnabled && lastBoundsRef.current) {
        loadHeatmapDataImmediate(lastBoundsRef.current, filters || undefined);
      }
    },
    [heatmapEnabled, setHeatmapFilters, loadHeatmapDataImmediate],
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cancelPendingRequest();
    };
  }, [cancelPendingRequest]);

  return {
    heatmapData,
    heatmapEnabled,
    isLoading: isLoadingHeatmap,
    filters: heatmapFilters,
    toggleHeatmap,
    loadHeatmapData,
    loadHeatmapDataImmediate,
    setFilters,
    cancelPendingRequest,
  };
};

export default useHeatmap;
