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
import {routesService} from '../services/api/routes';
import {heatmapService} from '../services/api/heatmap';

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
  preferSafeRoute: false,
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

      // Calculate primary route
      const route = await routesService.calculateRoute({
        origin: currentPosition,
        destination,
        preferSafeRoute: useSafeRoute,
      });

      // Try to get alternative route
      let alternativeRoute: RouteResponse | null = null;
      try {
        const alternatives = await routesService.getAlternativeRoutes({
          origin: currentPosition,
          destination,
          preferSafeRoute: !useSafeRoute,
        });
        if (alternatives.length > 0) {
          alternativeRoute = alternatives[0];
        }
      } catch {
        // Alternative route is optional, ignore errors
      }

      set({
        currentRoute: route,
        alternativeRoute,
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
      // heatmapService.getData automatically cancels pending requests
      const response = await heatmapService.getData(bounds, filters);
      set({
        heatmapData: response.points,
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
