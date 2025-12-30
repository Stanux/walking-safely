/**
 * Background Service
 * Manages resource release when app goes to background
 * Requirements: 15.5
 */

import {AppState, AppStateStatus} from 'react-native';
import KeepAwake from 'react-native-keep-awake';
import {locationService} from './location';

/**
 * Background state
 */
interface BackgroundState {
  isInBackground: boolean;
  isNavigationActive: boolean;
  wasTrackingBeforeBackground: boolean;
  appStateSubscription: ReturnType<typeof AppState.addEventListener> | null;
}

/**
 * Callbacks for background events
 */
interface BackgroundCallbacks {
  onEnterBackground?: () => void;
  onEnterForeground?: () => void;
  onResourcesReleased?: () => void;
  onResourcesRestored?: () => void;
}

/**
 * Wake lock interface using react-native-keep-awake
 */
interface WakeLock {
  activate: () => void;
  deactivate: () => void;
  isActive: () => boolean;
}

// Wake lock implementation using react-native-keep-awake
const wakeLock: WakeLock = {
  activate: () => {
    KeepAwake.activate('BackgroundService');
    console.log('[WakeLock] Activated');
  },
  deactivate: () => {
    KeepAwake.deactivate('BackgroundService');
    console.log('[WakeLock] Deactivated');
  },
  isActive: () => {
    // react-native-keep-awake doesn't provide a way to check if active
    // We'll track this internally
    return wakeLockActive;
  },
};

// Track wake lock state internally
let wakeLockActive = false;

/**
 * Background service state
 */
const state: BackgroundState = {
  isInBackground: false,
  isNavigationActive: false,
  wasTrackingBeforeBackground: false,
  appStateSubscription: null,
};

/**
 * Registered callbacks
 */
let callbacks: BackgroundCallbacks = {};

/**
 * Handle app state change
 * Requirement 15.5: Release resources when in background
 */
const handleAppStateChange = (nextAppState: AppStateStatus): void => {
  const wasInBackground = state.isInBackground;
  const isNowInBackground = nextAppState.match(/inactive|background/) !== null;

  if (!wasInBackground && isNowInBackground) {
    // App went to background
    state.isInBackground = true;
    handleEnterBackground();
  } else if (wasInBackground && nextAppState === 'active') {
    // App came to foreground
    state.isInBackground = false;
    handleEnterForeground();
  }
};

/**
 * Handle entering background
 * Requirement 15.5: Stop GPS when in background (except navigation active)
 */
const handleEnterBackground = (): void => {
  callbacks.onEnterBackground?.();

  // If navigation is NOT active, release resources
  if (!state.isNavigationActive) {
    releaseResources();
  }
  // If navigation IS active, keep GPS and wake lock running
};

/**
 * Handle entering foreground
 */
const handleEnterForeground = (): void => {
  callbacks.onEnterForeground?.();

  // Restore resources if they were released
  if (!state.isNavigationActive && state.wasTrackingBeforeBackground) {
    restoreResources();
  }
};

/**
 * Release background resources
 * Requirement 15.5: Release GPS and wake lock
 */
const releaseResources = (): void => {
  // Check if location was being tracked
  state.wasTrackingBeforeBackground = true; // This would be checked from location service

  // Stop all location tracking
  locationService.stopAllTracking();

  // Deactivate wake lock
  wakeLock.deactivate();
  wakeLockActive = false;

  callbacks.onResourcesReleased?.();
  console.log('[BackgroundService] Resources released');
};

/**
 * Restore resources after returning to foreground
 */
const restoreResources = (): void => {
  // Wake lock will be reactivated by the component that needs it
  // Location tracking will be restarted by the component that needs it

  callbacks.onResourcesRestored?.();
  console.log('[BackgroundService] Resources restored');
};

/**
 * Background Service Interface
 */
export interface BackgroundService {
  /**
   * Initialize background service
   * @param cbs - Callbacks for background events
   */
  initialize: (cbs?: BackgroundCallbacks) => void;

  /**
   * Cleanup background service
   */
  cleanup: () => void;

  /**
   * Set navigation active state
   * When navigation is active, resources are NOT released in background
   * @param active - Whether navigation is active
   */
  setNavigationActive: (active: boolean) => void;

  /**
   * Check if app is in background
   */
  isInBackground: () => boolean;

  /**
   * Check if navigation is active
   */
  isNavigationActive: () => boolean;

  /**
   * Activate wake lock
   */
  activateWakeLock: () => void;

  /**
   * Deactivate wake lock
   */
  deactivateWakeLock: () => void;

  /**
   * Force release resources (for manual cleanup)
   */
  forceReleaseResources: () => void;
}

/**
 * Background Service Implementation
 */
export const backgroundService: BackgroundService = {
  initialize: (cbs?: BackgroundCallbacks) => {
    // Store callbacks
    if (cbs) {
      callbacks = cbs;
    }

    // Subscribe to app state changes
    if (!state.appStateSubscription) {
      state.appStateSubscription = AppState.addEventListener(
        'change',
        handleAppStateChange,
      );
    }

    console.log('[BackgroundService] Initialized');
  },

  cleanup: () => {
    // Remove app state subscription
    if (state.appStateSubscription) {
      state.appStateSubscription.remove();
      state.appStateSubscription = null;
    }

    // Clear callbacks
    callbacks = {};

    // Reset state
    state.isInBackground = false;
    state.isNavigationActive = false;
    state.wasTrackingBeforeBackground = false;

    console.log('[BackgroundService] Cleaned up');
  },

  setNavigationActive: (active: boolean) => {
    const wasActive = state.isNavigationActive;
    
    // Only update if state actually changes
    if (active === wasActive) {
      console.log('[BackgroundService] setNavigationActive called but state unchanged:', active);
      return;
    }
    
    state.isNavigationActive = active;

    if (active && !wasActive) {
      // Navigation started - activate wake lock
      wakeLock.activate();
      wakeLockActive = true;
      console.log(
        '[BackgroundService] Navigation started, wake lock activated',
      );
    } else if (!active && wasActive) {
      // Navigation ended - deactivate wake lock if in background
      if (state.isInBackground) {
        wakeLock.deactivate();
        wakeLockActive = false;
        locationService.stopAllTracking();
      }
      console.log('[BackgroundService] Navigation ended');
    }
  },

  isInBackground: () => state.isInBackground,

  isNavigationActive: () => state.isNavigationActive,

  activateWakeLock: () => {
    wakeLock.activate();
    wakeLockActive = true;
  },

  deactivateWakeLock: () => {
    wakeLock.deactivate();
    wakeLockActive = false;
  },

  forceReleaseResources: () => {
    releaseResources();
  },
};

export default backgroundService;
