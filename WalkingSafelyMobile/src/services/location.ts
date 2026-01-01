/**
 * Location Service
 * Handles GPS location tracking, permissions, and position updates
 * Requirements: 3.1, 3.2, 13.1, 13.2, 13.3
 */

import Geolocation, {
  GeolocationResponse,
  GeolocationError,
} from '@react-native-community/geolocation';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  PermissionStatus,
} from 'react-native-permissions';
import {Platform} from 'react-native';
import {Coordinates} from '../types/models';

/**
 * Location permission status
 */
export type LocationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable'
  | 'limited';

/**
 * Location error types
 */
export type LocationErrorType =
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'unknown';

/**
 * Location error
 */
export interface LocationError {
  type: LocationErrorType;
  message: string;
  code?: number;
}

/**
 * Position with additional metadata
 */
export interface Position extends Coordinates {
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

/**
 * Options for getting current position
 */
export interface GetPositionOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

/**
 * Options for watching position
 */
export interface WatchPositionOptions extends GetPositionOptions {
  distanceFilter?: number;
  interval?: number;
  fastestInterval?: number;
}

/**
 * Callback for position updates
 */
export type PositionCallback = (position: Position) => void;

/**
 * Callback for position errors
 */
export type PositionErrorCallback = (error: LocationError) => void;

/**
 * Default São Paulo coordinates (fallback location)
 */
export const DEFAULT_LOCATION: Coordinates = {
  latitude: -23.5505,
  longitude: -46.6333,
};

/**
 * Default options for getting position
 */
const DEFAULT_GET_POSITION_OPTIONS: GetPositionOptions = {
  enableHighAccuracy: false, // Start with low accuracy for faster response
  timeout: 30000, // 30 seconds
  maximumAge: 60000, // Accept cached position up to 1 minute old
};

/**
 * Default options for watching position
 */
const DEFAULT_WATCH_OPTIONS: WatchPositionOptions = {
  enableHighAccuracy: true,
  timeout: 30000,
  maximumAge: 5000, // Accept cached position up to 5 seconds old
  distanceFilter: 3, // Update every 3 meters for better navigation tracking
};

/**
 * Get the appropriate permission constant based on platform
 */
const getLocationPermission = () => {
  return Platform.OS === 'ios'
    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
};

/**
 * Map react-native-permissions result to our status type
 */
const mapPermissionStatus = (
  result: PermissionStatus,
): LocationPermissionStatus => {
  switch (result) {
    case RESULTS.GRANTED:
      return 'granted';
    case RESULTS.DENIED:
      return 'denied';
    case RESULTS.BLOCKED:
      return 'blocked';
    case RESULTS.UNAVAILABLE:
      return 'unavailable';
    case RESULTS.LIMITED:
      return 'limited';
    default:
      return 'denied';
  }
};

/**
 * Map geolocation error to our error type
 */
const mapGeolocationError = (error: GeolocationError): LocationError => {
  switch (error.code) {
    case 1: // PERMISSION_DENIED
      return {
        type: 'permission_denied',
        message: 'Location permission was denied',
        code: error.code,
      };
    case 2: // POSITION_UNAVAILABLE
      return {
        type: 'position_unavailable',
        message: 'Location position is unavailable',
        code: error.code,
      };
    case 3: // TIMEOUT
      return {
        type: 'timeout',
        message: 'Location request timed out',
        code: error.code,
      };
    default:
      return {
        type: 'unknown',
        message: error.message || 'Unknown location error',
        code: error.code,
      };
  }
};

/**
 * Convert GeolocationResponse to Position
 */
const toPosition = (response: GeolocationResponse): Position => ({
  latitude: response.coords.latitude,
  longitude: response.coords.longitude,
  accuracy: response.coords.accuracy,
  altitude: response.coords.altitude,
  altitudeAccuracy: response.coords.altitudeAccuracy,
  heading: response.coords.heading,
  speed: response.coords.speed,
  timestamp: response.timestamp,
});

/**
 * Location Service Interface
 */
export interface LocationService {
  /**
   * Get current position
   * @param options - Position options
   * @returns Promise resolving to current position
   */
  getCurrentPosition(options?: GetPositionOptions): Promise<Position>;

  /**
   * Watch position changes
   * @param onPosition - Callback for position updates
   * @param onError - Callback for errors
   * @param options - Watch options
   * @returns Watch ID for clearing the watch
   */
  watchPosition(
    onPosition: PositionCallback,
    onError?: PositionErrorCallback,
    options?: WatchPositionOptions,
  ): number;

  /**
   * Clear a position watch
   * @param watchId - Watch ID to clear
   */
  clearWatch(watchId: number): void;

  /**
   * Request location permission
   * @returns Promise resolving to permission status
   */
  requestPermission(): Promise<LocationPermissionStatus>;

  /**
   * Check current location permission status
   * @returns Promise resolving to permission status
   */
  checkPermission(): Promise<LocationPermissionStatus>;

  /**
   * Check if location permission is granted
   * @returns Promise resolving to boolean
   */
  isPermissionGranted(): Promise<boolean>;

  /**
   * Stop all location tracking
   */
  stopAllTracking(): void;
}

// Track active watch IDs for cleanup
const activeWatchIds: Set<number> = new Set();

/**
 * Location Service Implementation
 */
export const locationService: LocationService = {
  getCurrentPosition: (options?: GetPositionOptions): Promise<Position> => {
    const mergedOptions = {...DEFAULT_GET_POSITION_OPTIONS, ...options};

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (response: GeolocationResponse) => {
          resolve(toPosition(response));
        },
        (error: GeolocationError) => {
          reject(mapGeolocationError(error));
        },
        mergedOptions,
      );
    });
  },

  watchPosition: (
    onPosition: PositionCallback,
    onError?: PositionErrorCallback,
    options?: WatchPositionOptions,
  ): number => {
    const mergedOptions = {...DEFAULT_WATCH_OPTIONS, ...options};

    const watchId = Geolocation.watchPosition(
      (response: GeolocationResponse) => {
        onPosition(toPosition(response));
      },
      (error: GeolocationError) => {
        if (onError) {
          onError(mapGeolocationError(error));
        }
      },
      mergedOptions,
    );

    activeWatchIds.add(watchId);
    return watchId;
  },

  clearWatch: (watchId: number): void => {
    Geolocation.clearWatch(watchId);
    activeWatchIds.delete(watchId);
  },

  requestPermission: async (): Promise<LocationPermissionStatus> => {
    const permission = getLocationPermission();
    const result = await request(permission);
    return mapPermissionStatus(result);
  },

  checkPermission: async (): Promise<LocationPermissionStatus> => {
    const permission = getLocationPermission();
    const result = await check(permission);
    return mapPermissionStatus(result);
  },

  isPermissionGranted: async (): Promise<boolean> => {
    const status = await locationService.checkPermission();
    return status === 'granted' || status === 'limited';
  },

  stopAllTracking: (): void => {
    activeWatchIds.forEach(watchId => {
      Geolocation.clearWatch(watchId);
    });
    activeWatchIds.clear();
  },
};

export default locationService;
