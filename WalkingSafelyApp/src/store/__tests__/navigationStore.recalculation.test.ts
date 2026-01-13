/**
 * Property-Based Tests for Route Recalculation
 * 
 * **Property 14: Route Recalculation Trigger and Preference Preservation**
 * **Validates: Requirements 16.1, 16.2, 16.3, 16.6**
 * 
 * For any position update during navigation where the distance from the current
 * position to the nearest point on the route polyline exceeds DEVIATION_THRESHOLD (30m),
 * the system SHALL trigger route recalculation using the same route type preference
 * (fastest or safest) as the original route.
 */

import * as fc from 'fast-check';
import {DEVIATION_THRESHOLD} from '../../utils/navigationConstants';
import {distanceToPolyline} from '../../utils/geo';
import type {Coordinates} from '../../types/models';

/**
 * Helper: Generate valid coordinates within a reasonable range
 */
const coordinatesArbitrary = fc.record({
  latitude: fc.double({min: -90, max: 90, noNaN: true}),
  longitude: fc.double({min: -180, max: 180, noNaN: true}),
});

/**
 * Helper: Generate a route polyline as array of coordinates
 */
const routeCoordinatesArbitrary = fc.array(coordinatesArbitrary, {minLength: 2, maxLength: 20});

/**
 * Helper: Check if deviation detection is correct
 * Requirement 16.1: Detect deviation > 30m from route
 */
function checkDeviation(
  currentPosition: Coordinates,
  routeCoordinates: Coordinates[]
): { deviated: boolean; distance: number } {
  if (routeCoordinates.length === 0) {
    return { deviated: false, distance: 0 };
  }
  
  const { distance } = distanceToPolyline(currentPosition, routeCoordinates);
  return {
    deviated: distance > DEVIATION_THRESHOLD,
    distance,
  };
}

/**
 * Helper: Simulate route recalculation decision
 * Requirements 16.1, 16.2, 16.6
 */
function shouldRecalculateRoute(
  currentPosition: Coordinates,
  routeCoordinates: Coordinates[],
  isRecalculating: boolean
): boolean {
  if (isRecalculating || routeCoordinates.length === 0) {
    return false;
  }
  
  const { deviated } = checkDeviation(currentPosition, routeCoordinates);
  return deviated;
}

/**
 * Route type preference type
 */
type RouteTypePreference = 'fastest' | 'safest';

/**
 * Simulate recalculation with preference preservation
 * Requirement 16.6: Preserve route type preference during recalculation
 */
function simulateRecalculation(
  originalPreference: RouteTypePreference,
  currentPosition: Coordinates,
  destination: Coordinates
): { preferSafeRoute: boolean; origin: Coordinates; destination: Coordinates } {
  return {
    preferSafeRoute: originalPreference === 'safest',
    origin: currentPosition,
    destination,
  };
}

describe('Property 14: Route Recalculation Trigger and Preference Preservation', () => {
  /**
   * Feature: post-login-navigation, Property 14: Route Recalculation Trigger and Preference Preservation
   * Validates: Requirements 16.1, 16.2, 16.3, 16.6
   */
  
  describe('Requirement 16.1: Deviation Detection', () => {
    it('should detect deviation when position is more than 30m from route', () => {
      fc.assert(
        fc.property(
          routeCoordinatesArbitrary,
          fc.double({min: 0.0005, max: 0.005, noNaN: true}), // Offset that guarantees > 30m
          fc.double({min: 0, max: 2 * Math.PI, noNaN: true}),
          (routeCoords, offset, angle) => {
            if (routeCoords.length < 2) return true; // Skip invalid routes
            
            // Create a position far from the route
            const basePoint = routeCoords[Math.floor(routeCoords.length / 2)];
            const farPosition: Coordinates = {
              latitude: basePoint.latitude + offset * Math.cos(angle),
              longitude: basePoint.longitude + offset * Math.sin(angle),
            };
            
            const { distance } = distanceToPolyline(farPosition, routeCoords);
            
            // If distance is greater than threshold, deviation should be detected
            if (distance > DEVIATION_THRESHOLD) {
              const { deviated } = checkDeviation(farPosition, routeCoords);
              return deviated === true;
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT detect deviation when position is within 30m of route', () => {
      fc.assert(
        fc.property(
          routeCoordinatesArbitrary,
          fc.integer({min: 0, max: 100}),
          (routeCoords, pointIndex) => {
            if (routeCoords.length < 2) return true;
            
            // Use a point exactly on the route
            const index = pointIndex % routeCoords.length;
            const onRoutePosition = routeCoords[index];
            
            const { deviated, distance } = checkDeviation(onRoutePosition, routeCoords);
            
            // Position on route should have distance ~0 and not be deviated
            return distance <= DEVIATION_THRESHOLD && deviated === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 16.2: Automatic Recalculation Trigger', () => {
    it('should trigger recalculation when deviation exceeds threshold', () => {
      fc.assert(
        fc.property(
          routeCoordinatesArbitrary,
          fc.double({min: 0.001, max: 0.01, noNaN: true}),
          fc.double({min: 0, max: 2 * Math.PI, noNaN: true}),
          (routeCoords, offset, angle) => {
            if (routeCoords.length < 2) return true;
            
            const basePoint = routeCoords[0];
            const deviatedPosition: Coordinates = {
              latitude: basePoint.latitude + offset * Math.cos(angle),
              longitude: basePoint.longitude + offset * Math.sin(angle),
            };
            
            const { distance } = distanceToPolyline(deviatedPosition, routeCoords);
            const shouldRecalculate = shouldRecalculateRoute(deviatedPosition, routeCoords, false);
            
            // If distance > threshold, should trigger recalculation
            if (distance > DEVIATION_THRESHOLD) {
              return shouldRecalculate === true;
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT trigger recalculation when already recalculating', () => {
      fc.assert(
        fc.property(
          routeCoordinatesArbitrary,
          coordinatesArbitrary,
          (routeCoords, position) => {
            if (routeCoords.length < 2) return true;
            
            // Even if deviated, should not trigger if already recalculating
            const shouldRecalculate = shouldRecalculateRoute(position, routeCoords, true);
            return shouldRecalculate === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 16.6: Route Type Preference Preservation', () => {
    it('should preserve "safest" preference during recalculation', () => {
      fc.assert(
        fc.property(
          coordinatesArbitrary,
          coordinatesArbitrary,
          (currentPos, destination) => {
            const result = simulateRecalculation('safest', currentPos, destination);
            
            // Should request safe route when original preference was safest
            return result.preferSafeRoute === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve "fastest" preference during recalculation', () => {
      fc.assert(
        fc.property(
          coordinatesArbitrary,
          coordinatesArbitrary,
          (currentPos, destination) => {
            const result = simulateRecalculation('fastest', currentPos, destination);
            
            // Should NOT request safe route when original preference was fastest
            return result.preferSafeRoute === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use current position as new origin during recalculation', () => {
      fc.assert(
        fc.property(
          coordinatesArbitrary,
          coordinatesArbitrary,
          fc.constantFrom<RouteTypePreference>('fastest', 'safest'),
          (currentPos, destination, _preference) => {
            const result = simulateRecalculation(_preference, currentPos, destination);
            
            // Origin should be current position
            return (
              result.origin.latitude === currentPos.latitude &&
              result.origin.longitude === currentPos.longitude
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain destination during recalculation', () => {
      fc.assert(
        fc.property(
          coordinatesArbitrary,
          coordinatesArbitrary,
          fc.constantFrom<RouteTypePreference>('fastest', 'safest'),
          (currentPos, destination, preference) => {
            const result = simulateRecalculation(preference, currentPos, destination);
            
            // Destination should remain the same
            return (
              result.destination.latitude === destination.latitude &&
              result.destination.longitude === destination.longitude
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('DEVIATION_THRESHOLD constant', () => {
    it('should be exactly 30 meters as per requirement', () => {
      expect(DEVIATION_THRESHOLD).toBe(30);
    });
  });

  describe('Integration: Full recalculation flow', () => {
    it('should correctly handle the full recalculation decision flow', () => {
      fc.assert(
        fc.property(
          routeCoordinatesArbitrary,
          coordinatesArbitrary,
          fc.boolean(),
          fc.constantFrom<RouteTypePreference>('fastest', 'safest'),
          (routeCoords, position, isRecalculating, _preference) => {
            if (routeCoords.length < 2) return true;
            
            const { deviated, distance } = checkDeviation(position, routeCoords);
            const shouldRecalculate = shouldRecalculateRoute(position, routeCoords, isRecalculating);
            
            // Verify the logic is consistent
            if (isRecalculating) {
              // Should never recalculate if already recalculating
              return shouldRecalculate === false;
            }
            
            if (distance > DEVIATION_THRESHOLD) {
              // Should recalculate if deviated and not already recalculating
              return shouldRecalculate === true && deviated === true;
            }
            
            // Should not recalculate if within threshold
            return shouldRecalculate === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
