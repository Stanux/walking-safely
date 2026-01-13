/**
 * TraveledRoute Component
 * Provides visual differentiation between traveled and remaining route segments
 * Requirements: 12.1, 12.2, 12.3
 *
 * 12.1: THE System SHALL display the traveled segment in gray-blue (#78909C)
 * 12.2: THE System SHALL display the remaining segment in blue (#2196F3)
 * 12.3: THE System SHALL dynamically update the colors as user advances
 */

import {Coordinates} from '../../types/models';
import {ROUTE_COLORS} from '../../utils/navigationConstants';

/**
 * Route segment with color information
 */
export interface RouteSegment {
  coordinates: Coordinates[];
  color: string;
  isTraveled: boolean;
}

/**
 * Result of splitting a route into traveled and remaining segments
 */
export interface SplitRouteResult {
  traveledSegment: RouteSegment;
  remainingSegment: RouteSegment;
}

/**
 * Calculate the distance between two coordinates in meters
 * Uses the Haversine formula for accuracy
 */
export const calculateDistanceBetweenPoints = (
  point1: Coordinates,
  point2: Coordinates,
): number => {
  const R = 6371000; // Earth's radius in meters
  const lat1Rad = (point1.latitude * Math.PI) / 180;
  const lat2Rad = (point2.latitude * Math.PI) / 180;
  const deltaLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Find the index of the closest point on the route to the current position
 */
export const findClosestPointIndex = (
  currentPosition: Coordinates,
  routeCoordinates: Coordinates[],
): number => {
  if (!routeCoordinates || routeCoordinates.length === 0) {
    return 0;
  }

  let minDistance = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < routeCoordinates.length; i++) {
    const distance = calculateDistanceBetweenPoints(
      currentPosition,
      routeCoordinates[i],
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }

  return closestIndex;
};

/**
 * Split the route into traveled and remaining segments based on current position
 * Requirements: 12.1, 12.2, 12.3
 *
 * @param routeCoordinates - Full route coordinates
 * @param currentPosition - Current user position
 * @returns Object containing traveled and remaining segments with their colors
 */
export const splitRouteByPosition = (
  routeCoordinates: Coordinates[],
  currentPosition: Coordinates | null,
): SplitRouteResult => {
  // Default result when no position or route
  const defaultResult: SplitRouteResult = {
    traveledSegment: {
      coordinates: [],
      color: ROUTE_COLORS.traveled,
      isTraveled: true,
    },
    remainingSegment: {
      coordinates: routeCoordinates || [],
      color: ROUTE_COLORS.remaining,
      isTraveled: false,
    },
  };

  if (!currentPosition || !routeCoordinates || routeCoordinates.length === 0) {
    return defaultResult;
  }

  // Find the closest point on the route to current position
  const closestIndex = findClosestPointIndex(currentPosition, routeCoordinates);

  // Split the route at the closest point
  // Traveled segment: from start to closest point (inclusive)
  // Remaining segment: from closest point to end
  const traveledCoordinates = routeCoordinates.slice(0, closestIndex + 1);
  const remainingCoordinates = routeCoordinates.slice(closestIndex);

  // Add current position to the end of traveled segment for smooth transition
  if (traveledCoordinates.length > 0) {
    traveledCoordinates.push(currentPosition);
  }

  // Add current position to the start of remaining segment
  if (remainingCoordinates.length > 0) {
    remainingCoordinates[0] = currentPosition;
  }

  return {
    traveledSegment: {
      coordinates: traveledCoordinates,
      color: ROUTE_COLORS.traveled, // #78909C - gray-blue (Req 12.1)
      isTraveled: true,
    },
    remainingSegment: {
      coordinates: remainingCoordinates,
      color: ROUTE_COLORS.remaining, // #2196F3 - blue (Req 12.2)
      isTraveled: false,
    },
  };
};

/**
 * Get the color for a route segment based on whether it's traveled
 * Requirements: 12.1, 12.2
 *
 * @param isTraveled - Whether the segment has been traveled
 * @returns The appropriate color for the segment
 */
export const getRouteSegmentColor = (isTraveled: boolean): string => {
  return isTraveled ? ROUTE_COLORS.traveled : ROUTE_COLORS.remaining;
};

/**
 * Calculate the percentage of route completed
 *
 * @param routeCoordinates - Full route coordinates
 * @param currentPosition - Current user position
 * @returns Percentage of route completed (0-100)
 */
export const calculateRouteProgress = (
  routeCoordinates: Coordinates[],
  currentPosition: Coordinates | null,
): number => {
  if (!currentPosition || !routeCoordinates || routeCoordinates.length < 2) {
    return 0;
  }

  const closestIndex = findClosestPointIndex(currentPosition, routeCoordinates);
  return Math.round((closestIndex / (routeCoordinates.length - 1)) * 100);
};

/**
 * Generate route segments for rendering with different colors
 * This is useful for map libraries that support multiple polylines
 *
 * @param routeCoordinates - Full route coordinates
 * @param currentPosition - Current user position
 * @returns Array of route segments with their respective colors
 */
export const generateRouteSegments = (
  routeCoordinates: Coordinates[],
  currentPosition: Coordinates | null,
): RouteSegment[] => {
  const {traveledSegment, remainingSegment} = splitRouteByPosition(
    routeCoordinates,
    currentPosition,
  );

  const segments: RouteSegment[] = [];

  // Only add segments that have coordinates
  if (traveledSegment.coordinates.length > 1) {
    segments.push(traveledSegment);
  }

  if (remainingSegment.coordinates.length > 1) {
    segments.push(remainingSegment);
  }

  // If no segments, return the full route as remaining
  if (segments.length === 0 && routeCoordinates.length > 0) {
    segments.push({
      coordinates: routeCoordinates,
      color: ROUTE_COLORS.remaining,
      isTraveled: false,
    });
  }

  return segments;
};

export default {
  splitRouteByPosition,
  getRouteSegmentColor,
  calculateRouteProgress,
  generateRouteSegments,
  findClosestPointIndex,
  calculateDistanceBetweenPoints,
};
