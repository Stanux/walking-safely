/**
 * useBackground Hook
 * Manages app background state and resource release
 * Requirements: 15.5
 */

import {useEffect, useCallback, useRef} from 'react';
import {backgroundService} from '../services/background';

/**
 * Hook options
 */
export interface UseBackgroundOptions {
  /** Whether this component requires navigation mode (keeps resources active in background) */
  isNavigationMode?: boolean;
  /** Callback when app enters background */
  onEnterBackground?: () => void;
  /** Callback when app enters foreground */
  onEnterForeground?: () => void;
  /** Callback when resources are released */
  onResourcesReleased?: () => void;
  /** Callback when resources are restored */
  onResourcesRestored?: () => void;
}

/**
 * Hook return type
 */
export interface UseBackgroundReturn {
  /** Whether app is currently in background */
  isInBackground: boolean;
  /** Whether navigation mode is active */
  isNavigationActive: boolean;
  /** Activate wake lock */
  activateWakeLock: () => void;
  /** Deactivate wake lock */
  deactivateWakeLock: () => void;
  /** Set navigation mode active/inactive */
  setNavigationActive: (active: boolean) => void;
}

/**
 * useBackground Hook
 *
 * Manages background state and resource release for the app.
 * When navigation mode is active, resources (GPS, wake lock) are kept active
 * even when the app goes to background.
 *
 * @param options - Hook configuration options
 * @returns Background state and actions
 *
 * @example
 * ```tsx
 * // In a navigation screen
 * const { setNavigationActive, activateWakeLock } = useBackground({
 *   isNavigationMode: true,
 *   onEnterBackground: () => console.log('App went to background'),
 * });
 *
 * useEffect(() => {
 *   setNavigationActive(true);
 *   activateWakeLock();
 *   return () => {
 *     setNavigationActive(false);
 *   };
 * }, []);
 * ```
 */
export function useBackground(
  options: UseBackgroundOptions = {},
): UseBackgroundReturn {
  const {
    isNavigationMode = false,
    onEnterBackground,
    onEnterForeground,
    onResourcesReleased,
    onResourcesRestored,
  } = options;

  const isInitializedRef = useRef(false);
  const isNavigationModeRef = useRef(isNavigationMode);
  
  // Keep ref updated
  isNavigationModeRef.current = isNavigationMode;

  /**
   * Initialize background service on mount - only once
   */
  useEffect(() => {
    if (!isInitializedRef.current) {
      backgroundService.initialize({
        onEnterBackground,
        onEnterForeground,
        onResourcesReleased,
        onResourcesRestored,
      });
      isInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  /**
   * Set navigation mode when option changes - only if isNavigationMode is true
   * This is handled separately to avoid conflicts with manual setNavigationActive calls
   */
  useEffect(() => {
    // Only auto-manage if isNavigationMode is explicitly true
    if (isNavigationMode) {
      console.log('[useBackground] Auto-activating navigation mode');
      backgroundService.setNavigationActive(true);

      return () => {
        console.log('[useBackground] Auto-deactivating navigation mode');
        backgroundService.setNavigationActive(false);
      };
    }
    // If isNavigationMode is false, don't auto-manage - let the component handle it
    return undefined;
  }, [isNavigationMode]);

  /**
   * Activate wake lock
   */
  const activateWakeLock = useCallback(() => {
    backgroundService.activateWakeLock();
  }, []);

  /**
   * Deactivate wake lock
   */
  const deactivateWakeLock = useCallback(() => {
    backgroundService.deactivateWakeLock();
  }, []);

  /**
   * Set navigation active state
   */
  const setNavigationActive = useCallback((active: boolean) => {
    backgroundService.setNavigationActive(active);
  }, []);

  return {
    isInBackground: backgroundService.isInBackground(),
    isNavigationActive: backgroundService.isNavigationActive(),
    activateWakeLock,
    deactivateWakeLock,
    setNavigationActive,
  };
}

export default useBackground;
