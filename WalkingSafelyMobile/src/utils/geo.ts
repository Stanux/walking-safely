/**
 * Geographic Utilities
 * Helper functions for geographic calculations
 * Requirements: 6.5 - Route deviation detection
 */

import {Coordinates} from '../types/models';

/**
 * Earth's radius in meters
 */
const EARTH_RADIUS = 6371000;

/**
 * Convert degrees to radians
 */
export const toRadians = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

/**
 * Convert radians to degrees
 */
export const toDegrees = (radians: number): number => {
  return (radians * 180) / Math.PI;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 - First coordinate
 * @param coord2 - Second coordinate
 * @returns Distance in meters
 */
export const calculateDistance = (
  coord1: Coordinates,
  coord2: Coordinates,
): number => {
  const lat1Rad = toRadians(coord1.latitude);
  const lat2Rad = toRadians(coord2.latitude);
  const deltaLat = toRadians(coord2.latitude - coord1.latitude);
  const deltaLon = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS * c;
};

/**
 * Calculate the bearing from one coordinate to another
 * @param from - Starting coordinate
 * @param to - Ending coordinate
 * @returns Bearing in degrees (0-360)
 */
export const calculateBearing = (
  from: Coordinates,
  to: Coordinates,
): number => {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
};

/**
 * Calculate the cross-track distance from a point to a great circle path
 * This is the perpendicular distance from a point to the line between two other points
 * @param point - The point to measure from
 * @param lineStart - Start of the line segment
 * @param lineEnd - End of the line segment
 * @returns Distance in meters (positive = right of path, negative = left of path)
 */
export const crossTrackDistance = (
  point: Coordinates,
  lineStart: Coordinates,
  lineEnd: Coordinates,
): number => {
  const d13 = calculateDistance(lineStart, point) / EARTH_RADIUS;
  const bearing13 = toRadians(calculateBearing(lineStart, point));
  const bearing12 = toRadians(calculateBearing(lineStart, lineEnd));

  const dxt = Math.asin(Math.sin(d13) * Math.sin(bearing13 - bearing12));
  return Math.abs(dxt * EARTH_RADIUS);
};

/**
 * Calculate the along-track distance from start to the closest point on the path
 * @param point - The point to measure from
 * @param lineStart - Start of the line segment
 * @param lineEnd - End of the line segment
 * @returns Distance in meters along the path
 */
export const alongTrackDistance = (
  point: Coordinates,
  lineStart: Coordinates,
  lineEnd: Coordinates,
): number => {
  const d13 = calculateDistance(lineStart, point) / EARTH_RADIUS;
  const dxt = crossTrackDistance(point, lineStart, lineEnd) / EARTH_RADIUS;

  const dat = Math.acos(Math.cos(d13) / Math.cos(dxt));
  return dat * EARTH_RADIUS;
};

/**
 * Find the minimum distance from a point to a polyline (array of coordinates)
 * @param point - The point to measure from
 * @param polyline - Array of coordinates forming the polyline
 * @returns Object with minimum distance and the index of the closest segment
 */
export const distanceToPolyline = (
  point: Coordinates,
  polyline: Coordinates[],
): {distance: number; segmentIndex: number} => {
  if (polyline.length === 0) {
    return {distance: Infinity, segmentIndex: -1};
  }

  if (polyline.length === 1) {
    return {
      distance: calculateDistance(point, polyline[0]),
      segmentIndex: 0,
    };
  }

  let minDistance = Infinity;
  let closestSegmentIndex = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const segmentStart = polyline[i];
    const segmentEnd = polyline[i + 1];
    const segmentLength = calculateDistance(segmentStart, segmentEnd);

    // Calculate along-track distance
    const alongTrack = alongTrackDistance(point, segmentStart, segmentEnd);

    let distance: number;

    if (alongTrack < 0) {
      // Point is before the segment start
      distance = calculateDistance(point, segmentStart);
    } else if (alongTrack > segmentLength) {
      // Point is after the segment end
      distance = calculateDistance(point, segmentEnd);
    } else {
      // Point is alongside the segment - use cross-track distance
      distance = crossTrackDistance(point, segmentStart, segmentEnd);
    }

    if (distance < minDistance) {
      minDistance = distance;
      closestSegmentIndex = i;
    }
  }

  return {distance: minDistance, segmentIndex: closestSegmentIndex};
};

/**
 * Check if a point is within a certain distance of a polyline
 * @param point - The point to check
 * @param polyline - Array of coordinates forming the polyline
 * @param threshold - Maximum distance in meters
 * @returns True if point is within threshold distance of the polyline
 */
export const isOnRoute = (
  point: Coordinates,
  polyline: Coordinates[],
  threshold: number,
): boolean => {
  const {distance} = distanceToPolyline(point, polyline);
  return distance <= threshold;
};

/**
 * Calculate the progress along a route as a percentage
 * @param currentPosition - Current position
 * @param routeCoordinates - Array of coordinates forming the route
 * @returns Progress as a value between 0 and 1
 */
export const calculateRouteProgress = (
  currentPosition: Coordinates,
  routeCoordinates: Coordinates[],
): number => {
  if (routeCoordinates.length < 2) {
    return 0;
  }

  const {segmentIndex} = distanceToPolyline(currentPosition, routeCoordinates);

  // Calculate total route length
  let totalLength = 0;
  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    totalLength += calculateDistance(
      routeCoordinates[i],
      routeCoordinates[i + 1],
    );
  }

  // Calculate distance traveled (up to current segment)
  let distanceTraveled = 0;
  for (let i = 0; i < segmentIndex; i++) {
    distanceTraveled += calculateDistance(
      routeCoordinates[i],
      routeCoordinates[i + 1],
    );
  }

  // Add distance within current segment
  if (segmentIndex < routeCoordinates.length - 1) {
    const segmentStart = routeCoordinates[segmentIndex];
    const alongTrack = alongTrackDistance(
      currentPosition,
      segmentStart,
      routeCoordinates[segmentIndex + 1],
    );
    distanceTraveled += Math.max(0, alongTrack);
  }

  return Math.min(1, Math.max(0, distanceTraveled / totalLength));
};

export default {
  calculateDistance,
  calculateBearing,
  crossTrackDistance,
  alongTrackDistance,
  distanceToPolyline,
  isOnRoute,
  calculateRouteProgress,
  toRadians,
  toDegrees,
};
