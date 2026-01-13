/**
 * useRiskAlerts Hook
 * Monitors proximity to risk points during navigation and triggers alerts
 * Requirements: 15.1, 15.4
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {Coordinates, Occurrence} from '../types/models';
import {calculateDistance} from '../utils/geo';
import {RISK_ALERT_DISTANCE} from '../utils/navigationConstants';

/**
 * Risk alert data structure
 */
export interface RiskAlert {
  /** The occurrence that triggered the alert */
  occurrence: Occurrence;
  /** Distance to the risk point in meters */
  distance: number;
  /** Timestamp when alert was triggered */
  triggeredAt: number;
}

/**
 * useRiskAlerts state interface
 */
export interface UseRiskAlertsState {
  /** Currently active risk alert */
  activeAlert: RiskAlert | null;
  /** Whether an alert is currently visible */
  isAlertVisible: boolean;
  /** Set of occurrence IDs that have already been alerted */
  alertedOccurrenceIds: Set<string>;
  /** Number of alerts triggered in current session */
  alertCount: number;
}

/**
 * useRiskAlerts actions interface
 */
export interface UseRiskAlertsActions {
  /** Check proximity to risk points and trigger alerts if needed */
  checkProximity: (position: Coordinates, occurrences: Occurrence[]) => RiskAlert | null;
  /** Dismiss the current alert */
  dismissAlert: () => void;
  /** Reset all alerted occurrences (for new navigation session) */
  resetAlerts: () => void;
  /** Manually trigger an alert for a specific occurrence */
  triggerAlert: (occurrence: Occurrence, distance: number) => void;
}

/**
 * useRiskAlerts options interface
 */
export interface UseRiskAlertsOptions {
  /** Distance threshold for triggering alerts in meters (default: RISK_ALERT_DISTANCE = 200) */
  alertDistance?: number;
  /** Auto-dismiss alert after duration in ms (0 = manual dismiss only, default: 0) */
  autoDismissAfter?: number;
  /** Callback when alert is triggered */
  onAlertTriggered?: (alert: RiskAlert) => void;
  /** Callback when alert is dismissed */
  onAlertDismissed?: () => void;
  /** Whether alerts are enabled (default: true) */
  enabled?: boolean;
}

/**
 * Combined return type
 */
export type UseRiskAlertsReturn = UseRiskAlertsState & UseRiskAlertsActions;

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<UseRiskAlertsOptions> = {
  alertDistance: RISK_ALERT_DISTANCE,
  autoDismissAfter: 0,
  onAlertTriggered: () => {},
  onAlertDismissed: () => {},
  enabled: true,
};

/**
 * Check if a position is within alert distance of any occurrence
 * Requirement 15.1: Emit Risk_Alert when user is approaching a Risk_Point
 * Requirement 15.4: Emit Risk_Alert when user is within configurable distance
 *
 * @param position Current user position
 * @param occurrences Array of occurrences to check
 * @param alertDistance Distance threshold in meters
 * @param alertedIds Set of already alerted occurrence IDs
 * @returns The closest occurrence within alert distance, or null
 */
export function findNearbyRiskPoint(
  position: Coordinates,
  occurrences: Occurrence[],
  alertDistance: number,
  alertedIds: Set<string>
): {occurrence: Occurrence; distance: number} | null {
  let closestOccurrence: Occurrence | null = null;
  let closestDistance = Infinity;

  for (const occurrence of occurrences) {
    // Skip already alerted occurrences
    if (alertedIds.has(occurrence.id)) {
      continue;
    }

    const distance = calculateDistance(position, occurrence.location);

    // Check if within alert distance and closer than current closest
    if (distance <= alertDistance && distance < closestDistance) {
      closestOccurrence = occurrence;
      closestDistance = distance;
    }
  }

  if (closestOccurrence) {
    return {
      occurrence: closestOccurrence,
      distance: closestDistance,
    };
  }

  return null;
}

/**
 * Check if alert should be triggered based on distance
 * Requirement 15.4: Emit Risk_Alert when user is within configurable distance
 *
 * @param distance Distance to risk point in meters
 * @param alertDistance Alert threshold distance in meters
 * @returns Whether alert should be triggered
 */
export function shouldTriggerAlert(
  distance: number,
  alertDistance: number
): boolean {
  return distance <= alertDistance;
}

/**
 * useRiskAlerts Hook
 *
 * Monitors user proximity to risk points during navigation and triggers
 * visual and audio alerts when approaching dangerous areas.
 *
 * Requirements:
 * - 15.1: Emit Risk_Alert when user is approaching a Risk_Point during Navigation_Mode
 * - 15.4: Emit Risk_Alert when user is within configurable distance of Risk_Point
 *
 * @param options Configuration options
 * @returns Risk alert state and actions
 *
 * @example
 * ```tsx
 * const {
 *   activeAlert,
 *   isAlertVisible,
 *   checkProximity,
 *   dismissAlert,
 * } = useRiskAlerts({
 *   alertDistance: 200,
 *   onAlertTriggered: (alert) => speakRiskAlert(alert.occurrence.crimeType.name, alert.distance),
 * });
 *
 * // Check proximity when position updates
 * useEffect(() => {
 *   if (currentPosition && occurrences.length > 0) {
 *     checkProximity(currentPosition, occurrences);
 *   }
 * }, [currentPosition, occurrences]);
 * ```
 */
export function useRiskAlerts(
  options: UseRiskAlertsOptions = {}
): UseRiskAlertsReturn {
  const mergedOptions = {...DEFAULT_OPTIONS, ...options};

  // State
  const [activeAlert, setActiveAlert] = useState<RiskAlert | null>(null);
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  // Refs
  const alertedOccurrenceIdsRef = useRef<Set<string>>(new Set());
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

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
   * Dismiss the current alert
   */
  const dismissAlert = useCallback(() => {
    clearAutoDismissTimer();
    setActiveAlert(null);
    setIsAlertVisible(false);
    mergedOptions.onAlertDismissed();
  }, [clearAutoDismissTimer, mergedOptions]);

  /**
   * Trigger an alert for a specific occurrence
   */
  const triggerAlert = useCallback(
    (occurrence: Occurrence, distance: number) => {
      if (!mergedOptions.enabled) {
        return;
      }

      // Mark occurrence as alerted
      alertedOccurrenceIdsRef.current.add(occurrence.id);

      // Create alert
      const alert: RiskAlert = {
        occurrence,
        distance,
        triggeredAt: Date.now(),
      };

      // Update state
      setActiveAlert(alert);
      setIsAlertVisible(true);
      setAlertCount(prev => prev + 1);

      // Call callback
      mergedOptions.onAlertTriggered(alert);

      // Set auto-dismiss timer if configured
      if (mergedOptions.autoDismissAfter > 0) {
        clearAutoDismissTimer();
        autoDismissTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            dismissAlert();
          }
        }, mergedOptions.autoDismissAfter);
      }

      console.log(
        `[useRiskAlerts] Alert triggered for ${occurrence.crimeType.name} at ${Math.round(distance)}m`
      );
    },
    [mergedOptions, clearAutoDismissTimer, dismissAlert]
  );

  /**
   * Check proximity to risk points and trigger alerts if needed
   * Requirement 15.1: Emit Risk_Alert when approaching Risk_Point
   * Requirement 15.4: Emit when within configurable distance
   */
  const checkProximity = useCallback(
    (position: Coordinates, occurrences: Occurrence[]): RiskAlert | null => {
      if (!mergedOptions.enabled || occurrences.length === 0) {
        return null;
      }

      // Find nearby risk point
      const nearbyRisk = findNearbyRiskPoint(
        position,
        occurrences,
        mergedOptions.alertDistance,
        alertedOccurrenceIdsRef.current
      );

      if (nearbyRisk) {
        // Trigger alert
        triggerAlert(nearbyRisk.occurrence, nearbyRisk.distance);

        return {
          occurrence: nearbyRisk.occurrence,
          distance: nearbyRisk.distance,
          triggeredAt: Date.now(),
        };
      }

      return null;
    },
    [mergedOptions.enabled, mergedOptions.alertDistance, triggerAlert]
  );

  /**
   * Reset all alerted occurrences
   */
  const resetAlerts = useCallback(() => {
    alertedOccurrenceIdsRef.current.clear();
    setAlertCount(0);
    dismissAlert();
    console.log('[useRiskAlerts] Alerts reset');
  }, [dismissAlert]);

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
    activeAlert,
    isAlertVisible,
    alertedOccurrenceIds: alertedOccurrenceIdsRef.current,
    alertCount,
    // Actions
    checkProximity,
    dismissAlert,
    resetAlerts,
    triggerAlert,
  };
}

export default useRiskAlerts;
