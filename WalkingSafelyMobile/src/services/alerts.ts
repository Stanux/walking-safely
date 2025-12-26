/**
 * Alert Service
 * Handles risk alerts during navigation, including distance calculations and sound playback
 * Requirements: 7.1, 7.2, 7.4
 */

import {Coordinates, Alert, AlertType, RouteResponse} from '../types/models';

/**
 * High risk region data from route analysis
 */
export interface HighRiskRegion {
  coordinates: Coordinates;
  riskIndex: number;
  crimeType?: string;
  radius: number; // meters
}

/**
 * Alert check result
 */
export interface AlertCheckResult {
  shouldAlert: boolean;
  alert: Alert | null;
  distanceToRisk: number | null;
  region: HighRiskRegion | null;
}

/**
 * Alert service configuration
 */
export interface AlertServiceConfig {
  /** Minimum risk index to trigger alert (default: 70) */
  minRiskIndex: number;
  /** Minimum alert distance in meters for high speeds (default: 500) */
  minAlertDistanceHighSpeed: number;
  /** Speed threshold in km/h for high-speed alert distance (default: 40) */
  highSpeedThreshold: number;
  /** Base alert distance in meters for low speeds (default: 200) */
  baseAlertDistance: number;
  /** Seconds of advance warning for high-speed alerts (default: 15) */
  advanceWarningSeconds: number;
}

/**
 * Default alert service configuration
 */
const DEFAULT_CONFIG: AlertServiceConfig = {
  minRiskIndex: 70,
  minAlertDistanceHighSpeed: 500,
  highSpeedThreshold: 40,
  baseAlertDistance: 200,
  advanceWarningSeconds: 15,
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
  const R = 6371000; // Earth's radius in meters
  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

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
 * Alert Service Interface
 */
export interface AlertService {
  /**
   * Check if alert conditions are met based on current position, speed, and route
   * Requirement 7.1: Emit visual alert when approaching high-risk region
   * @param position - Current user position
   * @param speed - Current speed in km/h
   * @param route - Current route with risk information
   * @param highRiskRegions - List of high-risk regions along the route
   * @param alertedRegions - Set of region IDs that have already been alerted
   * @returns Alert check result
   */
  checkAlertConditions(
    position: Coordinates,
    speed: number,
    route: RouteResponse,
    highRiskRegions: HighRiskRegion[],
    alertedRegions: Set<string>,
  ): AlertCheckResult;

  /**
   * Calculate the appropriate alert distance based on current speed
   * Requirement 7.4: Emit alerts with advance based on speed (minimum 500m for > 40km/h)
   * @param speed - Current speed in km/h
   * @returns Alert distance in meters
   */
  calculateAlertDistance(speed: number): number;

  /**
   * Play alert sound notification
   * Requirement 7.2: Play notification sound (if enabled in preferences)
   */
  playAlertSound(): void;

  /**
   * Extract high-risk regions from a route
   * @param route - Route response from backend
   * @returns Array of high-risk regions
   */
  extractHighRiskRegions(route: RouteResponse): HighRiskRegion[];

  /**
   * Generate a unique ID for a high-risk region
   * @param region - High-risk region
   * @returns Unique string identifier
   */
  getRegionId(region: HighRiskRegion): string;

  /**
   * Update service configuration
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<AlertServiceConfig>): void;

  /**
   * Get current configuration
   * @returns Current alert service configuration
   */
  getConfig(): AlertServiceConfig;
}

// Current configuration
let currentConfig: AlertServiceConfig = {...DEFAULT_CONFIG};

/**
 * Alert Service Implementation
 */
export const alertService: AlertService = {
  /**
   * Check if alert conditions are met
   * Requirement 7.1: Emit visual alert when approaching high-risk region
   */
  checkAlertConditions(
    position: Coordinates,
    speed: number,
    route: RouteResponse,
    highRiskRegions: HighRiskRegion[],
    alertedRegions: Set<string>,
  ): AlertCheckResult {
    // If route doesn't require warning, no alerts needed
    if (
      !route.requiresWarning &&
      route.maxRiskIndex < currentConfig.minRiskIndex
    ) {
      return {
        shouldAlert: false,
        alert: null,
        distanceToRisk: null,
        region: null,
      };
    }

    // Calculate alert distance based on current speed
    const alertDistance = alertService.calculateAlertDistance(speed);

    // Find the closest high-risk region that hasn't been alerted yet
    let closestRegion: HighRiskRegion | null = null;
    let closestDistance = Infinity;

    for (const region of highRiskRegions) {
      const regionId = alertService.getRegionId(region);

      // Skip already alerted regions
      if (alertedRegions.has(regionId)) {
        continue;
      }

      // Only consider regions with risk index >= threshold
      if (region.riskIndex < currentConfig.minRiskIndex) {
        continue;
      }

      const distance = calculateDistance(position, region.coordinates);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestRegion = region;
      }
    }

    // Check if we should alert
    if (closestRegion && closestDistance <= alertDistance) {
      const alert: Alert = {
        type: 'high_risk' as AlertType,
        title: 'alerts.highRiskArea',
        message: 'alerts.approachingHighRiskArea',
        riskIndex: closestRegion.riskIndex,
        crimeType: closestRegion.crimeType,
      };

      return {
        shouldAlert: true,
        alert,
        distanceToRisk: closestDistance,
        region: closestRegion,
      };
    }

    return {
      shouldAlert: false,
      alert: null,
      distanceToRisk: closestRegion ? closestDistance : null,
      region: closestRegion,
    };
  },

  /**
   * Calculate alert distance based on speed
   * Requirement 7.4: Minimum 500m for speeds > 40km/h
   */
  calculateAlertDistance(speed: number): number {
    // For speeds above threshold, calculate distance based on advance warning time
    if (speed > currentConfig.highSpeedThreshold) {
      // Convert speed from km/h to m/s and multiply by advance warning seconds
      const speedMs = speed / 3.6;
      const calculatedDistance = speedMs * currentConfig.advanceWarningSeconds;

      // Ensure minimum distance of 500m for high speeds
      return Math.max(
        currentConfig.minAlertDistanceHighSpeed,
        calculatedDistance,
      );
    }

    // For lower speeds, use base alert distance
    return currentConfig.baseAlertDistance;
  },

  /**
   * Play alert sound
   * Requirement 7.2: Play notification sound
   * Note: Actual sound playback requires react-native-sound or similar library
   */
  playAlertSound(): void {
    // TODO: Implement actual sound playback when react-native-sound is configured
    // For now, this is a placeholder that can be implemented with:
    // - react-native-sound
    // - expo-av
    // - react-native-audio-api

    // Example implementation with react-native-sound:
    // const Sound = require('react-native-sound');
    // Sound.setCategory('Playback');
    // const alertSound = new Sound('alert.mp3', Sound.MAIN_BUNDLE, (error) => {
    //   if (!error) {
    //     alertSound.play();
    //   }
    // });

    console.log('[AlertService] Playing alert sound');
  },

  /**
   * Extract high-risk regions from route
   * Analyzes route instructions to identify high-risk areas
   */
  extractHighRiskRegions(route: RouteResponse): HighRiskRegion[] {
    const regions: HighRiskRegion[] = [];

    // If route has high risk, create regions from instructions
    if (route.maxRiskIndex >= currentConfig.minRiskIndex) {
      // For now, we create a single region at the point of highest risk
      // In a real implementation, this would come from the backend with detailed risk data

      // Find instruction points that might be in high-risk areas
      // This is a simplified approach - the backend should provide actual risk regions
      for (const instruction of route.instructions) {
        // Assume instructions in high-risk areas have elevated risk
        // This would be enhanced with actual risk data from backend
        if (route.maxRiskIndex >= currentConfig.minRiskIndex) {
          regions.push({
            coordinates: instruction.coordinates,
            riskIndex: route.maxRiskIndex,
            crimeType: undefined, // Would come from backend
            radius: 100, // Default radius in meters
          });
        }
      }
    }

    return regions;
  },

  /**
   * Generate unique ID for a region
   */
  getRegionId(region: HighRiskRegion): string {
    // Create a unique ID based on coordinates (rounded to avoid floating point issues)
    const lat = Math.round(region.coordinates.latitude * 10000);
    const lon = Math.round(region.coordinates.longitude * 10000);
    return `region_${lat}_${lon}`;
  },

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AlertServiceConfig>): void {
    currentConfig = {...currentConfig, ...config};
  },

  /**
   * Get current configuration
   */
  getConfig(): AlertServiceConfig {
    return {...currentConfig};
  },
};

export default alertService;
