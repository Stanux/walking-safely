/**
 * Map Store
 * Manages map state, routes, and heatmap data
 * Requirements: 3.1, 5.1, 6.1, 9.1
 */

import {create} from 'zustand';
import {
  Coordinates,
  RouteResponse,
  HeatmapPoint,
  MapBounds,
  HeatmapFilters,
} from '../types/models';
import {routesService} from '@/services/api/routes';
import {heatmapService} from '@/services/api/heatmap';

/**
 * Map store state interface
 */
interface MapState {
  currentPosition: Coordinates | null;
  destination: Coordinates | null;
  currentRoute: RouteResponse | null;
  alternativeRoute: RouteResponse | null;
  isNavigating: boolean;
  isCalculatingRoute: boolean;
  heatmapEnabled: boolean;
  heatmapData: HeatmapPoint[];
  heatmapFilters: HeatmapFilters | null;
  isLoadingHeatmap: boolean;
  preferSafeRoute: boolean;
  error: string | null;
}

/**
 * Map store actions interface
 */
interface MapActions {
  setCurrentPosition: (position: Coordinates | null) => void;
  setDestination: (destination: Coordinates | null) => void;
  calculateRoute: (preferSafe?: boolean) => Promise<void>;
  startNavigation: () => void;
  stopNavigation: () => void;
  toggleHeatmap: () => void;
  loadHeatmapData: (
    bounds: MapBounds,
    filters?: HeatmapFilters,
  ) => Promise<void>;
  setHeatmapFilters: (filters: HeatmapFilters | null) => void;
  setPreferSafeRoute: (prefer: boolean) => void;
  clearRoute: () => void;
  clearError: () => void;
  selectAlternativeRoute: () => void;
}

/**
 * Combined map store type
 */
type MapStore = MapState & MapActions;

/**
 * Initial map state
 * Requirement 7.2: Default to safest route when user doesn't select
 */
const initialState: MapState = {
  currentPosition: null,
  destination: null,
  currentRoute: null,
  alternativeRoute: null,
  isNavigating: false,
  isCalculatingRoute: false,
  heatmapEnabled: false,
  heatmapData: [],
  heatmapFilters: null,
  isLoadingHeatmap: false,
  preferSafeRoute: true, // Default to safest route per Requirement 7.2
  error: null,
};

/**
 * Map store
 */
export const useMapStore = create<MapStore>()((set, get) => ({
  ...initialState,

  /**
   * Set current user position
   * Requirement 3.1: Display map centered on user location
   */
  setCurrentPosition: (position: Coordinates | null) => {
    set({currentPosition: position});
  },

  /**
   * Set navigation destination
   */
  setDestination: (destination: Coordinates | null) => {
    set({destination, currentRoute: null, alternativeRoute: null});
  },

  /**
   * Calculate route from current position to destination
   * Requirement 5.1: Send coordinates to backend for route calculation
   * Requirement 7.1: Calculate both safest and fastest routes for comparison
   */
  calculateRoute: async (preferSafe?: boolean) => {
    const {currentPosition, destination} = get();

    if (!currentPosition || !destination) {
      set({error: 'errors.missingCoordinates'});
      return;
    }

    set({isCalculatingRoute: true, error: null});

    try {
      const useSafeRoute = preferSafe ?? get().preferSafeRoute;

      // Calculate both routes in parallel for comparison
      const [safeRoute, fastRoute] = await Promise.all([
        routesService.calculateRoute({
          origin: currentPosition,
          destination,
          preferSafeRoute: true,
        }),
        routesService.calculateRoute({
          origin: currentPosition,
          destination,
          preferSafeRoute: false,
        }).catch(() => null), // Fast route is optional
      ]);

      // Set primary and alternative based on user preference
      const primaryRoute = useSafeRoute ? safeRoute : (fastRoute || safeRoute);
      const alternativeRoute = useSafeRoute ? fastRoute : safeRoute;

      console.log('[MapStore] Safe route risk:', safeRoute.averageRiskIndex, 'distance:', safeRoute.distance);
      if (fastRoute) {
        console.log('[MapStore] Fast route risk:', fastRoute.averageRiskIndex, 'distance:', fastRoute.distance);
      }

      set({
        currentRoute: primaryRoute,
        alternativeRoute: alternativeRoute !== primaryRoute ? alternativeRoute : null,
        isCalculatingRoute: false,
        preferSafeRoute: useSafeRoute,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'errors.routeCalculation';
      set({
        isCalculatingRoute: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  /**
   * Start active navigation mode
   * Requirement 6.1: Enter navigation mode with rotated map
   */
  startNavigation: () => {
    const {currentRoute} = get();
    if (currentRoute) {
      set({isNavigating: true});
    }
  },

  /**
   * Stop active navigation
   */
  stopNavigation: () => {
    set({isNavigating: false});
  },

  /**
   * Toggle heatmap layer visibility
   * Requirement 9.1: Toggle heatmap overlay on map
   */
  toggleHeatmap: () => {
    set(state => ({heatmapEnabled: !state.heatmapEnabled}));
  },

  /**
   * Load heatmap data for visible map region
   * Requirement 9.1: Request heatmap data from backend
   * Requirement 9.6: Request updated data when zoom changes
   * Requirement 15.4: Cancel pending requests
   */
  loadHeatmapData: async (bounds: MapBounds, filters?: HeatmapFilters) => {
    set({isLoadingHeatmap: true});

    try {
      // heatmapService.getHeatmapData automatically cancels pending requests
      const points = await heatmapService.getHeatmapData(bounds, filters);
      set({
        heatmapData: points,
        heatmapFilters: filters || null,
        isLoadingHeatmap: false,
      });
    } catch (error) {
      set({isLoadingHeatmap: false});
      // Don't throw - heatmap is non-critical
    }
  },

  /**
   * Set heatmap filters
   */
  setHeatmapFilters: (filters: HeatmapFilters | null) => {
    set({heatmapFilters: filters});
  },

  /**
   * Set route preference (safe vs fast)
   */
  setPreferSafeRoute: (prefer: boolean) => {
    set({preferSafeRoute: prefer});
  },

  /**
   * Clear current route
   */
  clearRoute: () => {
    set({
      currentRoute: null,
      alternativeRoute: null,
      destination: null,
      isNavigating: false,
    });
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({error: null});
  },

  /**
   * Select alternative route as current route
   */
  selectAlternativeRoute: () => {
    const {currentRoute, alternativeRoute} = get();
    if (alternativeRoute) {
      set({
        currentRoute: alternativeRoute,
        alternativeRoute: currentRoute,
      });
    }
  },
}));

export default useMapStore;
