/**
 * Map Utilities
 * Utility functions for map-related operations
 * Requirements: 2.1, 2.2, 2.3, 6.3
 */

import {Coordinates, MapBounds, Occurrence, Address} from '../types/models';
import {MIN_SEARCH_RESULTS} from './constants';

/**
 * Check if a coordinate is within map bounds
 * @param coordinate The coordinate to check
 * @param bounds The map bounds
 * @returns true if the coordinate is within bounds
 */
export function isCoordinateWithinBounds(
  coordinate: Coordinates,
  bounds: MapBounds
): boolean {
  const {latitude, longitude} = coordinate;
  const {northEast, southWest} = bounds;

  // Check latitude bounds
  const isLatitudeInBounds =
    latitude >= southWest.latitude && latitude <= northEast.latitude;

  // Check longitude bounds (handle wrap-around at 180/-180)
  let isLongitudeInBounds: boolean;
  if (southWest.longitude <= northEast.longitude) {
    // Normal case: bounds don't cross the antimeridian
    isLongitudeInBounds =
      longitude >= southWest.longitude && longitude <= northEast.longitude;
  } else {
    // Bounds cross the antimeridian (e.g., from 170 to -170)
    isLongitudeInBounds =
      longitude >= southWest.longitude || longitude <= northEast.longitude;
  }

  return isLatitudeInBounds && isLongitudeInBounds;
}

/**
 * Filter occurrences to only those within map bounds
 * Requirement 2.1: Display all risk points within visible map area
 * Requirement 2.2: Display risk points regardless of route status
 * Requirement 2.3: Update visible risk points when map moves
 *
 * @param occurrences Array of occurrences to filter
 * @param bounds The current map bounds
 * @returns Array of occurrences within the bounds
 */
export function filterOccurrencesWithinBounds(
  occurrences: Occurrence[],
  bounds: MapBounds
): Occurrence[] {
  return occurrences.filter(occurrence =>
    isCoordinateWithinBounds(occurrence.location, bounds)
  );
}

/**
 * Get visible occurrence IDs within bounds
 * Used for testing Property 2: Risk Points Visibility Within Bounds
 *
 * @param occurrences Array of occurrences
 * @param bounds The current map bounds
 * @returns Set of occurrence IDs that should be visible
 */
export function getVisibleOccurrenceIds(
  occurrences: Occurrence[],
  bounds: MapBounds
): Set<string> {
  const visibleOccurrences = filterOccurrencesWithinBounds(occurrences, bounds);
  return new Set(visibleOccurrences.map(occ => occ.id));
}


/**
 * Ensure search results meet minimum count requirement
 * Requirement 6.3: Display at least 5 results when available
 *
 * Property 7: Search Results Minimum Count
 * For any search query that returns results from the geocoding service,
 * the system SHALL display at least MIN_SEARCH_RESULTS (5) results
 * when 5 or more are available from the API.
 *
 * @param apiResults Results from the geocoding API
 * @returns Array of addresses with at least MIN_SEARCH_RESULTS if available
 */
export function ensureMinimumSearchResults(apiResults: Address[]): Address[] {
  // If API returns fewer than MIN_SEARCH_RESULTS, return all available
  // If API returns MIN_SEARCH_RESULTS or more, return at least MIN_SEARCH_RESULTS
  if (apiResults.length >= MIN_SEARCH_RESULTS) {
    // Return at least MIN_SEARCH_RESULTS results
    return apiResults.slice(0, Math.max(apiResults.length, MIN_SEARCH_RESULTS));
  }
  // Return all available results when fewer than minimum
  return apiResults;
}

/**
 * Check if search results meet the minimum count requirement
 * Used for testing Property 7: Search Results Minimum Count
 *
 * @param apiResultCount Number of results from API
 * @param displayedCount Number of results displayed to user
 * @returns true if the minimum count requirement is satisfied
 */
export function meetsMinimumSearchResultsRequirement(
  apiResultCount: number,
  displayedCount: number
): boolean {
  // If API has >= MIN_SEARCH_RESULTS, we must display at least MIN_SEARCH_RESULTS
  if (apiResultCount >= MIN_SEARCH_RESULTS) {
    return displayedCount >= MIN_SEARCH_RESULTS;
  }
  // If API has fewer, we display all available
  return displayedCount === apiResultCount;
}

/**
 * Route type options
 * Requirement 7.1: Allow choice between fastest and safest route
 */
export type RouteType = 'fastest' | 'safest';

/**
 * Get the default route type
 * Requirement 7.2: Default to safest route when user doesn't select
 *
 * Property 8: Default Route Type Selection
 * For any route calculation request where the user has not explicitly
 * selected a route type, the system SHALL request a Safest_Route
 * (prefer_safe_route=true) from the API.
 *
 * @returns The default route type ('safest')
 */
export function getDefaultRouteType(): RouteType {
  return 'safest';
}

/**
 * Convert route type to API preference boolean
 * Requirement 7.1: Allow choice between fastest and safest route
 *
 * @param routeType The selected route type
 * @returns true if safest route should be preferred
 */
export function routeTypeToPreferSafe(routeType: RouteType): boolean {
  return routeType === 'safest';
}

/**
 * Check if the route calculation request uses the correct default
 * Used for testing Property 8: Default Route Type Selection
 *
 * @param userSelectedType The route type selected by user (null if not selected)
 * @param apiPreferSafeRoute The prefer_safe_route value sent to API
 * @returns true if the default is correctly applied
 */
export function isDefaultRouteTypeCorrectlyApplied(
  userSelectedType: RouteType | null,
  apiPreferSafeRoute: boolean
): boolean {
  // If user didn't select a type, API should receive prefer_safe_route=true
  if (userSelectedType === null) {
    return apiPreferSafeRoute === true;
  }
  // If user selected a type, API should receive the corresponding value
  return apiPreferSafeRoute === routeTypeToPreferSafe(userSelectedType);
}
