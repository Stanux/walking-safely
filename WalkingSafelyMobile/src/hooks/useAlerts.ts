/**
 * useAlerts Hook
 * Manages risk alerts during active navigation
 * Requirements: 7.1, 7.3, 7.5
 */

import {useState, useEffect, useCallback, useRef} from 'react';
import {Alert, RouteResponse} from '../types/models';
import {
  alertService,
  AlertCheckResult,
  HighRiskRegion,
} from '../services/alerts';
import {useNavigationStore} from '../store/navigationStore';
import {usePreferencesStore} from '../store/preferencesStore';
import {useLocation} from './useLocation';

/**
 * Alert state for the hook
 */
export interface UseAlertsState {
  /** Current active alert */
  currentAlert: Alert | null;
  /** Whether an alert is currently being displayed */
  isAlertActive: boolean;
  /** Distance to the nearest high-risk region in meters */
  distanceToRisk: number | null;
  /** High-risk regions along the current route */
  highRiskRegions: HighRiskRegion[];
  /** Whether alerts are enabled (from preferences) */
  alertsEnabled: boolean;
  /** Whether sound alerts are enabled (from preferences) */
  soundEnabled: boolean;
  /** Number of alerts triggered in current session */
  alertCount: number;
}

/**
 * Alert actions for the hook
 */
export interface UseAlertsActions {
  /** Dismiss the current alert */
  dismissAlert: () => void;
  /** Check for alerts manually */
  checkAlerts: () => AlertCheckResult;
  /** Clear all alerted regions (reset for new route) */
  resetAlertedRegions: () => void;
  /** Update high-risk regions for current route */
  updateHighRiskRegions: (route: RouteResponse) => void;
}

/**
 * Combined hook return type
 */
export type UseAlertsReturn = UseAlertsState & UseAlertsActions;

/**
 * Hook options
 */
export interface UseAlertsOptions {
  /** Auto-check alerts when position changes (default: true) */
  autoCheck?: boolean;
  /** Minimum interval between alert checks in ms (default: 1000) */
  checkInterval?: number;
  /** Auto-dismiss alert after duration in ms (0 = manual dismiss only) */
  autoDismissAfter?: number;
}

/**
 * Default hook options
 */
const DEFAULT_OPTIONS: UseAlertsOptions = {
  autoCheck: true,
  checkInterval: 1000,
  autoDismissAfter: 0,
};

/**
 * useAlerts Hook
 *
 * Provides alert functionality during active navigation.
 * Integrates with navigation store for route data and location hook for position.
 *
 * Requirements:
 * - 7.1: Emit visual alert when approaching high-risk region
 * - 7.3: Display predominant crime type in the region
 * - 7.5: Allow dismissing alert with a tap
 *
 * @param options - Hook configuration options
 * @returns Alert state and actions
 *
 * @example
 * ```tsx
 * const {
 *   currentAlert,
 *   isAlertActive,
 *   dismissAlert
 * } = useAlerts();
 *
 * if (isAlertActive && currentAlert) {
 *   return <AlertModal alert={currentAlert} onDismiss={dismissAlert} />;
 * }
 * ```
 */
export function useAlerts(options: UseAlertsOptions = {}): UseAlertsReturn {
  const mergedOptions = {...DEFAULT_OPTIONS, ...options};

  // State
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [distanceToRisk, setDistanceToRisk] = useState<number | null>(null);
  const [highRiskRegions, setHighRiskRegions] = useState<HighRiskRegion[]>([]);
  const [alertCount, setAlertCount] = useState(0);

  // Refs
  const alertedRegionsRef = useRef<Set<string>>(new Set());
  const lastCheckTimeRef = useRef<number>(0);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Store state
  const {route, sessionId, speed} = useNavigationStore();
  const {alertsEnabled, soundEnabled, alertTypes} = usePreferencesStore();

  // Location hook
  const {coordinates} = useLocation({
    autoStartTracking: false,
    updateMapStore: false,
  });

  /**
   * Clear auto-dismiss timer
   */
  const clearAutoDismissTimer = useCallback(() => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
  }, []);

  /**
   * Dismiss current alert
   * Requirement 7.5: Allow dismissing alert with a tap
   */
  const dismissAlert = useCallback(() => {
    clearAutoDismissTimer();
    setCurrentAlert(null);
    setIsAlertActive(false);
  }, [clearAutoDismissTimer]);

  /**
   * Show an alert
   */
  const showAlert = useCallback(
    (alert: Alert, region: HighRiskRegion) => {
      // Mark region as alerted
      const regionId = alertService.getRegionId(region);
      alertedRegionsRef.current.add(regionId);

      // Set alert state
      setCurrentAlert(alert);
      setIsAlertActive(true);
      setAlertCount(prev => prev + 1);

      // Play sound if enabled
      // Requirement 7.2: Play notification sound (if enabled)
      if (soundEnabled) {
        alertService.playAlertSound();
      }

      // Set auto-dismiss timer if configured
      if (
        mergedOptions.autoDismissAfter &&
        mergedOptions.autoDismissAfter > 0
      ) {
        clearAutoDismissTimer();
        autoDismissTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            dismissAlert();
          }
        }, mergedOptions.autoDismissAfter);
      }
    },
    [
      soundEnabled,
      mergedOptions.autoDismissAfter,
      clearAutoDismissTimer,
      dismissAlert,
    ],
  );

  /**
   * Check for alerts based on current position
   * Requirement 7.1: Emit visual alert when approaching high-risk region
   */
  const checkAlerts = useCallback((): AlertCheckResult => {
    const emptyResult: AlertCheckResult = {
      shouldAlert: false,
      alert: null,
      distanceToRisk: null,
      region: null,
    };

    // Don't check if alerts are disabled
    if (!alertsEnabled) {
      return emptyResult;
    }

    // Don't check if not in active navigation
    if (!sessionId || !route) {
      return emptyResult;
    }

    // Don't check if no position
    if (!coordinates) {
      return emptyResult;
    }

    // Throttle checks
    const now = Date.now();
    if (now - lastCheckTimeRef.current < mergedOptions.checkInterval!) {
      return emptyResult;
    }
    lastCheckTimeRef.current = now;

    // Check alert conditions
    const result = alertService.checkAlertConditions(
      coordinates,
      speed,
      route,
      highRiskRegions,
      alertedRegionsRef.current,
    );

    // Update distance to risk
    setDistanceToRisk(result.distanceToRisk);

    // Show alert if conditions are met
    if (result.shouldAlert && result.alert && result.region) {
      // Check if alert type is enabled in preferences
      const crimeType = result.region.crimeType;
      const isTypeEnabled =
        alertTypes.length === 0 || // All types enabled if empty
        (crimeType && alertTypes.includes(crimeType));

      if (isTypeEnabled) {
        showAlert(result.alert, result.region);
      }
    }

    return result;
  }, [
    alertsEnabled,
    sessionId,
    route,
    coordinates,
    speed,
    highRiskRegions,
    alertTypes,
    mergedOptions.checkInterval,
    showAlert,
  ]);

  /**
   * Reset alerted regions (for new route)
   */
  const resetAlertedRegions = useCallback(() => {
    alertedRegionsRef.current.clear();
    setAlertCount(0);
    dismissAlert();
  }, [dismissAlert]);

  /**
   * Update high-risk regions for current route
   */
  const updateHighRiskRegions = useCallback((newRoute: RouteResponse) => {
    const regions = alertService.extractHighRiskRegions(newRoute);
    setHighRiskRegions(regions);
  }, []);

  /**
   * Update high-risk regions when route changes
   */
  useEffect(() => {
    if (route) {
      updateHighRiskRegions(route);
    } else {
      setHighRiskRegions([]);
    }
  }, [route, updateHighRiskRegions]);

  /**
   * Reset alerted regions when session changes
   */
  useEffect(() => {
    if (sessionId) {
      resetAlertedRegions();
    }
  }, [sessionId, resetAlertedRegions]);

  /**
   * Auto-check alerts when position changes
   */
  useEffect(() => {
    if (mergedOptions.autoCheck && coordinates && sessionId) {
      checkAlerts();
    }
  }, [coordinates, mergedOptions.autoCheck, sessionId, checkAlerts]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearAutoDismissTimer();
    };
  }, [clearAutoDismissTimer]);

  return {
    // State
    currentAlert,
    isAlertActive,
    distanceToRisk,
    highRiskRegions,
    alertsEnabled,
    soundEnabled,
    alertCount,
    // Actions
    dismissAlert,
    checkAlerts,
    resetAlertedRegions,
    updateHighRiskRegions,
  };
}

export default useAlerts;
