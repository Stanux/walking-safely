/**
 * Navigation Store
 * Manages active navigation session state
 * Requirements: 6.2, 6.3, 6.4, 6.5, 13.3, 16.1, 16.2, 16.6
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
import {decodePolyline} from '../components/map';
import {distanceToPolyline, calculateDistance} from '../utils/geo';
import {DEVIATION_THRESHOLD} from '../utils/navigationConstants';

/**
 * Route type preference for navigation
 * Requirement 16.6: Preserve route type preference during recalculation
 */
export type RouteTypePreference = 'fastest' | 'safest';

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
  /** Route type preference (fastest or safest) - preserved during recalculation */
  routeTypePreference: RouteTypePreference;
  /** Destination coordinates for recalculation */
  destination: Coordinates | null;
  /** Flag indicating route was just recalculated */
  wasRecalculated: boolean;
  /** Last recalculation timestamp */
  lastRecalculationTime: number | null;
  /** Flag indicating current instruction should be narrated */
  shouldNarrate: boolean;
  /** Index of last narrated instruction to avoid repeating */
  lastNarratedIndex: number;
}

/**
 * Navigation store actions interface
 */
interface NavigationActions {
  startSession: (route: RouteResponse, routeType?: RouteTypePreference, destination?: Coordinates) => void;
  endSession: () => void;
  updatePosition: (position: Coordinates, speed?: number) => void;
  checkForRecalculation: () => Promise<RouteRecalculationResponse | null>;
  checkTrafficUpdate: () => Promise<TrafficUpdateResponse | null>;
  acceptAlternativeRoute: () => void;
  rejectAlternativeRoute: () => void;
  advanceInstruction: () => void;
  setError: (error: string | null) => void;
  /** Set route type preference */
  setRouteTypePreference: (preference: RouteTypePreference) => void;
  /** Clear recalculation flag */
  clearRecalculationFlag: () => void;
  /** Check if user has deviated from route */
  checkDeviation: () => { deviated: boolean; distance: number };
  /** Mark current instruction as narrated */
  markAsNarrated: () => void;
}

/**
 * Combined navigation store type
 */
type NavigationStore = NavigationState & NavigationActions;

/**
 * Minimum time between recalculations (milliseconds)
 * Prevents excessive API calls
 */
const RECALCULATION_COOLDOWN = 5000; // 5 seconds

/**
 * Distance threshold for narrating next instruction (meters)
 * Requirement 14.4: Narrate instructions with adequate advance notice
 */
export const INSTRUCTION_NARRATE_THRESHOLD = 30;

/**
 * Distance threshold for advancing to next instruction (meters)
 * Requirement 13.3: Advance to next instruction when movement is completed
 * User reaches the instruction point (within 10m)
 */
export const INSTRUCTION_ADVANCE_THRESHOLD = 10;

/**
 * Traffic check interval (milliseconds)
 */
const TRAFFIC_CHECK_INTERVAL = 60000; // 60 seconds

/**
 * Determine if instruction should be narrated based on distance
 * Requirement 14.4: Narrate instructions with adequate advance notice (30m)
 *
 * @param distanceToInstruction Distance from current position to instruction point (meters)
 * @returns Whether to narrate the instruction
 */
export function shouldNarrateInstruction(
  distanceToInstruction: number
): boolean {
  return distanceToInstruction <= INSTRUCTION_NARRATE_THRESHOLD && distanceToInstruction > INSTRUCTION_ADVANCE_THRESHOLD;
}

/**
 * Determine if instruction should advance based on distance
 * Requirement 13.3: Update Maneuver_Indicator to next movement when current is completed
 *
 * @param distanceToTarget Distance from current position to target point (meters)
 * @param currentIndex Current instruction index
 * @param totalInstructions Total number of instructions
 * @param currentManeuver Current instruction maneuver type
 * @param distanceFromStart Distance from start point (for depart instruction)
 * @returns Whether to advance to next instruction
 */
export function shouldAdvanceInstruction(
  distanceToTarget: number,
  currentIndex: number,
  totalInstructions: number,
  currentManeuver?: string,
  distanceFromStart?: number
): boolean {
  // Don't advance if at last instruction
  if (currentIndex >= totalInstructions - 1) {
    return false;
  }

  // For "depart" instruction (first instruction), advance once user starts moving
  // away from the start point (moved more than 10m from origin)
  if (currentManeuver === 'depart' && distanceFromStart !== undefined) {
    return distanceFromStart > INSTRUCTION_ADVANCE_THRESHOLD;
  }

  // For other instructions, advance when within threshold distance of target
  return distanceToTarget < INSTRUCTION_ADVANCE_THRESHOLD;
}

/**
 * Get the target coordinates for an instruction
 * For navigation, we need to calculate distance to where the maneuver happens,
 * which is the NEXT instruction's coordinates (where we need to turn/act),
 * not the current instruction's start point.
 *
 * @param instructions Array of route instructions
 * @param currentIndex Current instruction index
 * @returns Target coordinates for distance calculation
 */
export function getInstructionTargetCoordinates(
  instructions: RouteInstruction[],
  currentIndex: number
): Coordinates {
  // If there's a next instruction, target its coordinates (where the maneuver happens)
  if (currentIndex + 1 < instructions.length) {
    return instructions[currentIndex + 1].coordinates;
  }
  // For the last instruction, use its own coordinates (destination)
  return instructions[currentIndex].coordinates;
}

/**
 * Get the next instruction index based on current position
 * Requirement 13.3: Advance to next instruction when movement is completed
 *
 * @param currentPosition Current user position
 * @param instructions Array of route instructions
 * @param currentIndex Current instruction index
 * @returns New instruction index (same or incremented)
 */
export function getNextInstructionIndex(
  currentPosition: Coordinates,
  instructions: RouteInstruction[],
  currentIndex: number
): number {
  if (currentIndex >= instructions.length) {
    return currentIndex;
  }

  const currentInstruction = instructions[currentIndex];
  
  // Calculate distance to the target point (next instruction's coordinates)
  const targetCoordinates = getInstructionTargetCoordinates(instructions, currentIndex);
  const distanceToTarget = calculateDistance(
    currentPosition,
    targetCoordinates
  );

  // For depart instruction, also calculate distance from start point
  const distanceFromStart = currentInstruction.maneuver === 'depart'
    ? calculateDistance(currentPosition, currentInstruction.coordinates)
    : undefined;

  if (shouldAdvanceInstruction(
    distanceToTarget,
    currentIndex,
    instructions.length,
    currentInstruction.maneuver,
    distanceFromStart
  )) {
    return currentIndex + 1;
  }

  return currentIndex;
}

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
  routeTypePreference: 'safest',
  destination: null,
  wasRecalculated: false,
  lastRecalculationTime: null,
  shouldNarrate: false,
  lastNarratedIndex: -1,
};

/**
 * Navigation store
 */
export const useNavigationStore = create<NavigationStore>()((set, get) => ({
  ...initialState,

  /**
   * Start a new navigation session
   * Requirement 16.6: Store route type preference for recalculation
   */
  startSession: (route: RouteResponse, routeType: RouteTypePreference = 'safest', destination?: Coordinates) => {
    const sessionId = generateSessionId();
    const firstInstruction =
      route.instructions.length > 0 ? route.instructions[0] : null;

    // Extract destination from route if not provided
    const routeDestination = destination || (route.instructions.length > 0 
      ? route.instructions[route.instructions.length - 1].coordinates 
      : null);

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
      routeTypePreference: routeType,
      destination: routeDestination,
      wasRecalculated: false,
      lastRecalculationTime: null,
      shouldNarrate: false,
      lastNarratedIndex: -1,
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
   * Requirement 13.3: Advance to next instruction when movement is completed
   * Requirement 14.4: Narrate instructions with adequate advance notice (30m)
   */
  updatePosition: (position: Coordinates, speed?: number) => {
    const {route, currentInstructionIndex, lastNarratedIndex} = get();

    if (!route) {
      return;
    }

    // Calculate remaining distance by summing distances from current position to all remaining instructions
    let remainingDistance = 0;
    
    if (route.instructions.length > 0) {
      // Distance from current position to next instruction
      if (currentInstructionIndex < route.instructions.length) {
        const nextInstruction = route.instructions[currentInstructionIndex];
        remainingDistance += calculateDistance(position, nextInstruction.coordinates);
        
        // Add distances between all remaining instructions
        for (let i = currentInstructionIndex; i < route.instructions.length - 1; i++) {
          const currentInstr = route.instructions[i];
          const nextInstr = route.instructions[i + 1];
          remainingDistance += calculateDistance(currentInstr.coordinates, nextInstr.coordinates);
        }
      } else {
        // If we're past all instructions, just distance to final destination
        const lastInstruction = route.instructions[route.instructions.length - 1];
        remainingDistance = calculateDistance(position, lastInstruction.coordinates);
      }
    }

    // Estimate remaining duration based on speed
    const currentSpeed = speed ?? get().speed;
    const remainingDuration =
      currentSpeed > 0
        ? Math.round(remainingDistance / (currentSpeed / 3.6)) // Convert km/h to m/s
        : route.duration;

    // Check if we should advance to next instruction
    // Requirement 13.3: Update Maneuver_Indicator to next movement when current is completed
    const newInstructionIndex = getNextInstructionIndex(
      position,
      route.instructions,
      currentInstructionIndex
    );

    const currentInstruction = route.instructions[currentInstructionIndex];

    if (currentInstruction) {
      // Calculate distance to the target point (where the maneuver happens)
      // This is the NEXT instruction's coordinates, not the current instruction's start
      const targetCoordinates = getInstructionTargetCoordinates(
        route.instructions,
        currentInstructionIndex
      );
      const distanceToTarget = calculateDistance(position, targetCoordinates);

      // Check if we're advancing to a new instruction
      const isAdvancingToNewInstruction = newInstructionIndex !== currentInstructionIndex;

      // Determine if we should narrate:
      // 1. When advancing to a new instruction - always narrate the new instruction
      // 2. When approaching current instruction target (at 30m, not yet narrated)
      let shouldNarrateNow = false;
      let instructionToNarrate = currentInstruction;
      let distanceForNarration = distanceToTarget;

      if (isAdvancingToNewInstruction) {
        // Narrate the NEW instruction we're advancing to
        const newInstruction = route.instructions[newInstructionIndex];
        if (newInstruction) {
          // Always narrate when advancing to a new instruction
          shouldNarrateNow = true;
          instructionToNarrate = newInstruction;
          // Calculate distance to the new instruction's target
          const newTargetCoordinates = getInstructionTargetCoordinates(
            route.instructions,
            newInstructionIndex
          );
          distanceForNarration = calculateDistance(position, newTargetCoordinates);
          console.log('[NavigationStore] Advancing to next instruction:', newInstructionIndex, '- will narrate');
        }
      } else {
        // Check if we should narrate current instruction (at 30m, not yet narrated)
        // Requirement 14.4: Narrate instructions with adequate advance notice
        shouldNarrateNow = shouldNarrateInstruction(distanceToTarget) && 
                          currentInstructionIndex !== lastNarratedIndex;
        if (shouldNarrateNow) {
          console.log('[NavigationStore] Should narrate instruction at distance:', distanceToTarget);
        }
      }
      
      // Update distance to target point for voice prompts
      const updatedInstruction = {
        ...instructionToNarrate,
        distance: Math.round(distanceForNarration),
      };

      // Don't update lastNarratedIndex here - let the UI component do it after actually narrating
      // This prevents race conditions where the index is marked before narration happens

      set({
        currentPosition: position,
        speed: speed ?? get().speed,
        remainingDistance,
        remainingDuration,
        currentInstructionIndex: newInstructionIndex,
        currentInstruction: isAdvancingToNewInstruction 
          ? updatedInstruction 
          : {...currentInstruction, distance: Math.round(distanceToTarget)},
        shouldNarrate: shouldNarrateNow,
      });
    } else {
      // No current instruction, just update position
      set({
        currentPosition: position,
        speed: speed ?? get().speed,
        remainingDistance,
        remainingDuration,
        shouldNarrate: false,
      });
    }
  },

  /**
   * Check if route recalculation is needed
   * Requirement 16.1: Detect deviation > 30m from route
   * Requirement 16.2: Initiate automatic recalculation
   * Requirement 16.6: Preserve route type preference and use current position as new origin
   */
  checkForRecalculation: async () => {
    const {
      sessionId,
      currentPosition,
      route,
      isRecalculating,
      routeTypePreference,
      destination,
      lastRecalculationTime,
    } = get();

    if (!sessionId || !currentPosition || !route || isRecalculating) {
      return null;
    }

    // Check cooldown to prevent excessive recalculations
    const now = Date.now();
    if (lastRecalculationTime && now - lastRecalculationTime < RECALCULATION_COOLDOWN) {
      return null;
    }

    // Decode the route polyline to get all coordinates
    const routeCoordinates = decodePolyline(route.polyline);

    // Check if user has deviated from route using polyline distance
    // Requirement 16.1: Detect deviation > 30m (DEVIATION_THRESHOLD)
    const {distance: minDistance} = distanceToPolyline(
      currentPosition,
      routeCoordinates,
    );

    console.log('[NavigationStore] Distance from route:', minDistance, 'threshold:', DEVIATION_THRESHOLD);

    // If deviation exceeds threshold (30m), recalculate
    if (minDistance > DEVIATION_THRESHOLD) {
      console.log('[NavigationStore] User deviated from route, initiating recalculation');
      set({isRecalculating: true, wasRecalculated: false});

      try {
        // Requirement 16.6: Use current position as new origin
        // Requirement 16.3: Respect initial route type choice
        if (destination) {
          // Calculate new route from current position to destination
          const newRoute = await routesService.calculateRoute({
            origin: currentPosition,
            destination: destination,
            preferSafeRoute: routeTypePreference === 'safest',
          });

          // Update route with recalculated one
          set({
            route: newRoute,
            currentInstruction:
              newRoute.instructions.length > 0
                ? newRoute.instructions[0]
                : null,
            currentInstructionIndex: 0,
            remainingDistance: newRoute.distance,
            remainingDuration: newRoute.duration,
            isRecalculating: false,
            wasRecalculated: true,
            lastRecalculationTime: Date.now(),
            pendingAlternativeRoute: null,
          });

          return {
            route: newRoute,
            hasAlternative: false,
          } as RouteRecalculationResponse;
        } else {
          // Fallback to session-based recalculation if no destination stored
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
            wasRecalculated: true,
            lastRecalculationTime: Date.now(),
            pendingAlternativeRoute: result.hasAlternative
              ? result.alternativeRoute || null
              : null,
          });

          return result;
        }
      } catch (error) {
        console.error('[NavigationStore] Route recalculation failed:', error);
        set({
          isRecalculating: false,
          wasRecalculated: false,
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

  /**
   * Set route type preference
   * Requirement 16.6: Allow setting route type preference
   */
  setRouteTypePreference: (preference: RouteTypePreference) => {
    set({routeTypePreference: preference});
  },

  /**
   * Clear recalculation flag
   * Used after UI has shown recalculation notification
   */
  clearRecalculationFlag: () => {
    set({wasRecalculated: false});
  },

  /**
   * Check if user has deviated from route
   * Requirement 16.1: Detect deviation > 30m from route
   * Returns deviation status and distance
   */
  checkDeviation: () => {
    const {currentPosition, route} = get();

    if (!currentPosition || !route) {
      return {deviated: false, distance: 0};
    }

    const routeCoordinates = decodePolyline(route.polyline);
    const {distance} = distanceToPolyline(currentPosition, routeCoordinates);

    return {
      deviated: distance > DEVIATION_THRESHOLD,
      distance,
    };
  },

  /**
   * Mark current instruction as narrated
   * Prevents repeating the same voice instruction
   */
  markAsNarrated: () => {
    const {currentInstructionIndex} = get();
    set({
      shouldNarrate: false,
      lastNarratedIndex: currentInstructionIndex,
    });
  },
}));

export default useNavigationStore;
