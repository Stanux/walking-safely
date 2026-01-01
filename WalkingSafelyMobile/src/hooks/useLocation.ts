/**
 * useLocation Hook
 * Encapsulates location permission handling and position tracking
 * Requirements: 3.1, 6.3, 13.1, 13.2, 13.3
 */

import {useState, useEffect, useCallback, useRef} from 'react';
import {
  locationService,
  LocationPermissionStatus,
  LocationError,
  Position,
  WatchPositionOptions,
} from '../services/location';
import {useMapStore} from '../store/mapStore';
import {Coordinates} from '../types/models';

/**
 * Location hook state
 */
export interface UseLocationState {
  /** Current position with metadata */
  position: Position | null;
  /** Simple coordinates (latitude/longitude only) */
  coordinates: Coordinates | null;
  /** Current permission status */
  permissionStatus: LocationPermissionStatus | null;
  /** Whether location is being tracked */
  isTracking: boolean;
  /** Whether permission is being requested */
  isRequestingPermission: boolean;
  /** Whether position is being fetched */
  isLoading: boolean;
  /** Current error if any */
  error: LocationError | null;
  /** Whether permission is granted */
  hasPermission: boolean;
}

/**
 * Location hook actions
 */
export interface UseLocationActions {
  /** Request location permission */
  requestPermission: () => Promise<LocationPermissionStatus>;
  /** Get current position once */
  getCurrentPosition: () => Promise<Position | null>;
  /** Start watching position */
  startTracking: (options?: WatchPositionOptions) => void;
  /** Stop watching position */
  stopTracking: () => void;
  /** Clear any error */
  clearError: () => void;
  /** Refresh permission status */
  refreshPermissionStatus: () => Promise<void>;
}

/**
 * Combined hook return type
 */
export type UseLocationReturn = UseLocationState & UseLocationActions;

/**
 * Hook options
 */
export interface UseLocationOptions {
  /** Auto-request permission on mount */
  autoRequestPermission?: boolean;
  /** Auto-start tracking when permission is granted */
  autoStartTracking?: boolean;
  /** Update map store with position changes */
  updateMapStore?: boolean;
  /** Watch position options */
  watchOptions?: WatchPositionOptions;
}

/**
 * Default hook options
 */
const DEFAULT_OPTIONS: UseLocationOptions = {
  autoRequestPermission: false,
  autoStartTracking: false,
  updateMapStore: true,
  watchOptions: {
    enableHighAccuracy: true,
    distanceFilter: 3, // Update every 3 meters for better navigation
    timeout: 15000,
    maximumAge: 5000, // Accept cached position up to 5 seconds old
  },
};

/**
 * useLocation Hook
 *
 * Provides location tracking functionality with permission management.
 * Integrates with the map store to update current position.
 *
 * @param options - Hook configuration options
 * @returns Location state and actions
 *
 * @example
 * ```tsx
 * const {
 *   coordinates,
 *   hasPermission,
 *   requestPermission,
 *   startTracking
 * } = useLocation({ autoRequestPermission: true });
 *
 * useEffect(() => {
 *   if (hasPermission) {
 *     startTracking();
 *   }
 * }, [hasPermission]);
 * ```
 */
export function useLocation(
  options: UseLocationOptions = {},
): UseLocationReturn {
  const mergedOptions = {...DEFAULT_OPTIONS, ...options};

  // State
  const [position, setPosition] = useState<Position | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<LocationPermissionStatus | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LocationError | null>(null);

  // Refs
  const watchIdRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Map store
  const setCurrentPosition = useMapStore(state => state.setCurrentPosition);

  /**
   * Derived state: coordinates from position
   */
  const coordinates: Coordinates | null = position
    ? {latitude: position.latitude, longitude: position.longitude}
    : null;

  /**
   * Derived state: whether permission is granted
   */
  const hasPermission =
    permissionStatus === 'granted' || permissionStatus === 'limited';

  /**
   * Update map store with new position
   */
  const updateMapStorePosition = useCallback(
    (pos: Position | null) => {
      if (mergedOptions.updateMapStore && pos) {
        setCurrentPosition({
          latitude: pos.latitude,
          longitude: pos.longitude,
        });
      }
    },
    [mergedOptions.updateMapStore, setCurrentPosition],
  );

  /**
   * Handle position update
   */
  const handlePositionUpdate = useCallback(
    (pos: Position) => {
      if (!isMountedRef.current) {
        return;
      }
      setPosition(pos);
      setError(null);
      updateMapStorePosition(pos);
    },
    [updateMapStorePosition],
  );

  /**
   * Handle position error
   */
  const handlePositionError = useCallback((err: LocationError) => {
    if (!isMountedRef.current) {
      return;
    }
    setError(err);
  }, []);

  /**
   * Refresh permission status
   * Requirement 13.3: Check permission status
   */
  const refreshPermissionStatus = useCallback(async () => {
    try {
      const status = await locationService.checkPermission();
      if (isMountedRef.current) {
        setPermissionStatus(status);

        // If permission was revoked while tracking, stop tracking
        // Requirement 13.3: Stop GPS access when permission is revoked
        if (status !== 'granted' && status !== 'limited' && isTracking) {
          if (watchIdRef.current !== null) {
            locationService.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          setIsTracking(false);
        }
      }
    } catch {
      // Ignore errors during permission check
    }
  }, [isTracking]);

  /**
   * Request location permission
   * Requirement 13.1: Request permission with explanation
   */
  const requestPermission =
    useCallback(async (): Promise<LocationPermissionStatus> => {
      setIsRequestingPermission(true);
      setError(null);

      try {
        const status = await locationService.requestPermission();
        if (isMountedRef.current) {
          setPermissionStatus(status);
        }
        return status;
      } catch (err) {
        const locationError: LocationError = {
          type: 'unknown',
          message: 'Failed to request permission',
        };
        if (isMountedRef.current) {
          setError(locationError);
        }
        throw locationError;
      } finally {
        if (isMountedRef.current) {
          setIsRequestingPermission(false);
        }
      }
    }, []);

  /**
   * Get current position once
   * Requirement 3.1: Get user's current location
   */
  const getCurrentPosition = useCallback(async (): Promise<Position | null> => {
    // Check permission first
    const currentStatus =
      permissionStatus ?? (await locationService.checkPermission());

    if (currentStatus !== 'granted' && currentStatus !== 'limited') {
      const locationError: LocationError = {
        type: 'permission_denied',
        message: 'Location permission not granted',
      };
      setError(locationError);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const pos = await locationService.getCurrentPosition();
      if (isMountedRef.current) {
        setPosition(pos);
        updateMapStorePosition(pos);
      }
      return pos;
    } catch (err) {
      const locationError = err as LocationError;
      if (isMountedRef.current) {
        setError(locationError);
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [permissionStatus, updateMapStorePosition]);

  /**
   * Start watching position
   * Requirement 6.3: Track position during navigation
   */
  const startTracking = useCallback(
    (watchOptions?: WatchPositionOptions) => {
      // Don't start if already tracking
      if (watchIdRef.current !== null) {
        return;
      }

      // Check permission
      if (!hasPermission) {
        setError({
          type: 'permission_denied',
          message: 'Location permission not granted',
        });
        return;
      }

      const options = watchOptions ?? mergedOptions.watchOptions;

      watchIdRef.current = locationService.watchPosition(
        handlePositionUpdate,
        handlePositionError,
        options,
      );

      setIsTracking(true);
      setError(null);
    },
    [
      hasPermission,
      mergedOptions.watchOptions,
      handlePositionUpdate,
      handlePositionError,
    ],
  );

  /**
   * Stop watching position
   * Requirement 13.3: Stop GPS access when requested
   */
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      locationService.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check permission on mount
   */
  useEffect(() => {
    refreshPermissionStatus();
  }, [refreshPermissionStatus]);

  /**
   * Auto-request permission if configured
   */
  useEffect(() => {
    const autoRequest = async () => {
      if (mergedOptions.autoRequestPermission && permissionStatus === 'denied') {
        await requestPermission();
      }
    };
    autoRequest();
  }, [
    mergedOptions.autoRequestPermission,
    permissionStatus,
    requestPermission,
  ]);

  /**
   * Auto-start tracking if configured and permission granted
   */
  useEffect(() => {
    if (mergedOptions.autoStartTracking && hasPermission && !isTracking) {
      startTracking();
      
      // Also try to get current position immediately
      getCurrentPosition().catch(() => {
        // Ignore errors, tracking will handle position updates
      });
    }
  }, [
    mergedOptions.autoStartTracking,
    hasPermission,
    isTracking,
    startTracking,
    getCurrentPosition,
  ]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (watchIdRef.current !== null) {
        locationService.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return {
    // State
    position,
    coordinates,
    permissionStatus,
    isTracking,
    isRequestingPermission,
    isLoading,
    error,
    hasPermission,
    // Actions
    requestPermission,
    getCurrentPosition,
    startTracking,
    stopTracking,
    clearError,
    refreshPermissionStatus,
  };
}

export default useLocation;
