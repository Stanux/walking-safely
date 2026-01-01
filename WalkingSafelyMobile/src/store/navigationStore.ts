/**
 * Navigation Store
 * Manages active navigation session state
 * Requirements: 6.2, 6.3, 6.4, 6.5
 */

import {create} from 'zustand';
import {
  Coordinates,
  RouteResponse,
  RouteInstruction,
  RouteRecalculationResponse,
} from '../types/models';
import {TrafficUpdateResponse} from '../types/api';
import {routesService} from '../services/api/routes';
import {decodePolyline} from '../components/map/RoutePolyline';
import {distanceToPolyline, calculateDistance} from '../utils/geo';

/**
 * Navigation store state interface
 */
interface NavigationState {
  sessionId: string | null;
  route: RouteResponse | null;
  currentInstruction: RouteInstruction | null;
  currentInstructionIndex: number;
  remainingDistance: number;
  remainingDuration: number;
  speed: number;
  currentPosition: Coordinates | null;
  isRecalculating: boolean;
  lastTrafficCheck: number | null;
  pendingAlternativeRoute: RouteResponse | null;
  error: string | null;
}

/**
 * Navigation store actions interface
 */
interface NavigationActions {
  startSession: (route: RouteResponse) => void;
  endSession: () => void;
  updatePosition: (position: Coordinates, speed?: number) => void;
  checkForRecalculation: () => Promise<RouteRecalculationResponse | null>;
  checkTrafficUpdate: () => Promise<TrafficUpdateResponse | null>;
  acceptAlternativeRoute: () => void;
  rejectAlternativeRoute: () => void;
  advanceInstruction: () => void;
  setError: (error: string | null) => void;
}

/**
 * Combined navigation store type
 */
type NavigationStore = NavigationState & NavigationActions;

/**
 * Distance threshold for route deviation (meters)
 */
const DEVIATION_THRESHOLD = 50;

/**
 * Traffic check interval (milliseconds)
 */
const TRAFFIC_CHECK_INTERVAL = 60000; // 60 seconds

/**
 * Generate a unique session ID
 */
const generateSessionId = (): string => {
  return `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Initial navigation state
 */
const initialState: NavigationState = {
  sessionId: null,
  route: null,
  currentInstruction: null,
  currentInstructionIndex: 0,
  remainingDistance: 0,
  remainingDuration: 0,
  speed: 0,
  currentPosition: null,
  isRecalculating: false,
  lastTrafficCheck: null,
  pendingAlternativeRoute: null,
  error: null,
};

/**
 * Navigation store
 */
export const useNavigationStore = create<NavigationStore>()((set, get) => ({
  ...initialState,

  /**
   * Start a new navigation session
   */
  startSession: (route: RouteResponse) => {
    const sessionId = generateSessionId();
    const firstInstruction =
      route.instructions.length > 0 ? route.instructions[0] : null;

    set({
      sessionId,
      route,
      currentInstruction: firstInstruction,
      currentInstructionIndex: 0,
      remainingDistance: route.distance,
      remainingDuration: route.duration,
      speed: 0,
      isRecalculating: false,
      lastTrafficCheck: Date.now(),
      pendingAlternativeRoute: null,
      error: null,
    });
  },

  /**
   * End current navigation session
   */
  endSession: () => {
    set(initialState);
  },

  /**
   * Update current position and speed
   * Requirement 6.3: Update position in real-time
   */
  updatePosition: (position: Coordinates, speed?: number) => {
    const {route, currentInstructionIndex} = get();

    if (!route) {
      return;
    }

    console.log('[NavigationStore] Updating position:', position, 'Speed:', speed);

    // Calculate remaining distance from current position to destination
    const lastInstruction = route.instructions[route.instructions.length - 1];
    const remainingDistance = lastInstruction
      ? calculateDistance(position, lastInstruction.coordinates)
      : 0;

    // Estimate remaining duration based on speed
    const currentSpeed = speed ?? get().speed;
    const remainingDuration =
      currentSpeed > 0
        ? Math.round(remainingDistance / (currentSpeed / 3.6)) // Convert km/h to m/s
        : route.duration;

    // Check if we should advance to next instruction
    const currentInstruction = route.instructions[currentInstructionIndex];
    let newInstructionIndex = currentInstructionIndex;

    if (currentInstruction) {
      const distanceToInstruction = calculateDistance(
        position,
        currentInstruction.coordinates,
      );

      console.log('[NavigationStore] Distance to current instruction:', distanceToInstruction, 'meters');
      console.log('[NavigationStore] Current instruction:', currentInstruction.text);

      // If within 30m of instruction point, advance to next
      if (
        distanceToInstruction < 30 &&
        currentInstructionIndex < route.instructions.length - 1
      ) {
        newInstructionIndex = currentInstructionIndex + 1;
        console.log('[NavigationStore] Advancing to next instruction:', newInstructionIndex);
      }
      
      // Update distance to current instruction for voice prompts
      const updatedInstruction = {
        ...currentInstruction,
        distance: Math.round(distanceToInstruction),
      };

      set({
        currentPosition: position,
        speed: speed ?? get().speed,
        remainingDistance,
        remainingDuration,
        currentInstructionIndex: newInstructionIndex,
        currentInstruction: newInstructionIndex === currentInstructionIndex 
          ? updatedInstruction 
          : route.instructions[newInstructionIndex] || null,
      });
    } else {
      // No current instruction, just update position
      set({
        currentPosition: position,
        speed: speed ?? get().speed,
        remainingDistance,
        remainingDuration,
      });
    }
  },

  /**
   * Check if route recalculation is needed
   * Requirement 6.5: Automatic recalculation when user deviates
   */
  checkForRecalculation: async () => {
    const {sessionId, currentPosition, route, isRecalculating} = get();

    if (!sessionId || !currentPosition || !route || isRecalculating) {
      return null;
    }

    // Decode the route polyline to get all coordinates
    const routeCoordinates = decodePolyline(route.polyline);

    // Check if user has deviated from route using polyline distance
    const {distance: minDistance} = distanceToPolyline(
      currentPosition,
      routeCoordinates,
    );

    // If deviation exceeds threshold, recalculate
    if (minDistance > DEVIATION_THRESHOLD) {
      set({isRecalculating: true});

      try {
        const result = await routesService.recalculateRoute(
          sessionId,
          currentPosition,
        );

        // Update route with recalculated one
        set({
          route: result.route,
          currentInstruction:
            result.route.instructions.length > 0
              ? result.route.instructions[0]
              : null,
          currentInstructionIndex: 0,
          remainingDistance: result.route.distance,
          remainingDuration: result.route.duration,
          isRecalculating: false,
          pendingAlternativeRoute: result.hasAlternative
            ? result.alternativeRoute || null
            : null,
        });

        return result;
      } catch (error) {
        set({
          isRecalculating: false,
          error:
            error instanceof Error
              ? error.message
              : 'errors.routeRecalculation',
        });
        return null;
      }
    }

    return null;
  },

  /**
   * Check for traffic updates
   * Requirement 8.1: Check traffic every 60 seconds
   */
  checkTrafficUpdate: async () => {
    const {sessionId, currentPosition, lastTrafficCheck} = get();

    if (!sessionId || !currentPosition) {
      return null;
    }

    // Check if enough time has passed since last check
    const now = Date.now();
    if (lastTrafficCheck && now - lastTrafficCheck < TRAFFIC_CHECK_INTERVAL) {
      return null;
    }

    try {
      const result = await routesService.checkTrafficUpdate(
        sessionId,
        currentPosition,
      );

      set({lastTrafficCheck: now});

      if (result.hasUpdate && result.alternativeRoute) {
        set({pendingAlternativeRoute: result.alternativeRoute});
      }

      return result;
    } catch {
      // Traffic updates are non-critical, don't throw
      set({lastTrafficCheck: now});
      return null;
    }
  },

  /**
   * Accept pending alternative route
   */
  acceptAlternativeRoute: () => {
    const {pendingAlternativeRoute} = get();

    if (pendingAlternativeRoute) {
      set({
        route: pendingAlternativeRoute,
        currentInstruction:
          pendingAlternativeRoute.instructions.length > 0
            ? pendingAlternativeRoute.instructions[0]
            : null,
        currentInstructionIndex: 0,
        remainingDistance: pendingAlternativeRoute.distance,
        remainingDuration: pendingAlternativeRoute.duration,
        pendingAlternativeRoute: null,
      });
    }
  },

  /**
   * Reject pending alternative route
   */
  rejectAlternativeRoute: () => {
    set({pendingAlternativeRoute: null});
  },

  /**
   * Manually advance to next instruction
   */
  advanceInstruction: () => {
    const {route, currentInstructionIndex} = get();

    if (!route || currentInstructionIndex >= route.instructions.length - 1) {
      return;
    }

    const newIndex = currentInstructionIndex + 1;
    set({
      currentInstructionIndex: newIndex,
      currentInstruction: route.instructions[newIndex],
    });
  },

  /**
   * Set error state
   */
  setError: (error: string | null) => {
    set({error});
  },
}));

export default useNavigationStore;
