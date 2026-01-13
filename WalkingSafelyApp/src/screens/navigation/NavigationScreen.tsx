/**
 * NavigationScreen
 * Turn-by-turn navigation screen with real-time updates
 * Requirements: 11.1, 11.2, 11.3, 12.1, 12.2, 12.3, 15.1, 15.2, 15.3, 15.4
 */

import React, {useRef, useCallback, useEffect, useState, useMemo} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal as RNModal,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors, getRiskColor} from '../../theme/colors';
import {
  spacing,
  borderRadius,
  shadows,
  componentSpacing,
} from '../../theme/spacing';
import {textStyles} from '../../theme/typography';
import {MapView, MapViewRef, decodePolyline} from '../../components/map';
import {Button} from '../../shared/components';
import {RiskAlertBanner} from '../../components/navigation';
import {useNavigationStore} from '../../store/navigationStore';
import {useMapStore} from '../../store/mapStore';
import {useRiskAlerts} from '../../hooks/useRiskAlerts';
import {useVoiceNavigation} from '../../hooks/useVoiceNavigation';
import {RISK_WARNING_THRESHOLD} from '../../utils/constants';
import type {ActiveNavigationScreenProps} from '../../types/navigation';
import type {Coordinates, Occurrence} from '../../types/models';

/**
 * Format duration from seconds to human readable string
 */
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
};

/**
 * Format distance from meters to human readable string
 */
const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

/**
 * Get maneuver icon based on maneuver type
 */
const getManeuverIcon = (maneuver: string): string => {
  const icons: Record<string, string> = {
    'turn-left': '↰',
    'turn-right': '↱',
    'turn-slight-left': '↖',
    'turn-slight-right': '↗',
    'turn-sharp-left': '⬅',
    'turn-sharp-right': '➡',
    'uturn-left': '↩',
    'uturn-right': '↪',
    straight: '↑',
    merge: '⤵',
    'ramp-left': '↙',
    'ramp-right': '↘',
    'fork-left': '⑂',
    'fork-right': '⑂',
    'roundabout-left': '↺',
    'roundabout-right': '↻',
    arrive: '🏁',
    depart: '🚗',
  };
  return icons[maneuver] || '↑';
};

/**
 * Get background color based on maneuver type
 */
const getManeuverColor = (maneuver: string): string => {
  if (maneuver.includes('left')) return '#2563EB';
  if (maneuver.includes('right')) return '#059669';
  if (maneuver === 'arrive') return '#7C3AED';
  if (maneuver === 'straight') return '#0891B2';
  return '#2563EB';
};

/**
 * Navigation Banner Component - Top of screen instruction popup
 * Shows the next maneuver with large icon and distance
 */
interface NavigationBannerProps {
  instruction: string;
  distance: number;
  maneuver: string;
}

const NavigationBanner: React.FC<NavigationBannerProps> = ({
  instruction,
  distance,
  maneuver,
}) => {
  const maneuverColor = getManeuverColor(maneuver);

  return (
    <View style={[styles.navigationBanner, {backgroundColor: maneuverColor}]}>
      <View style={styles.bannerLeft}>
        <View style={styles.bannerIconContainer}>
          <Text style={styles.bannerIcon}>{getManeuverIcon(maneuver)}</Text>
        </View>
        <Text style={styles.bannerDistance}>{formatDistance(distance)}</Text>
      </View>
      <View style={styles.bannerRight}>
        <Text style={styles.bannerStreet} numberOfLines={2}>
          {instruction}
        </Text>
      </View>
    </View>
  );
};

/**
 * Navigation Info Bar Component
 * Requirement 6.4: Display ETA and remaining distance
 */
interface NavigationInfoBarProps {
  remainingDuration: number;
  remainingDistance: number;
  speed: number;
  riskIndex: number;
}

const NavigationInfoBar: React.FC<NavigationInfoBarProps> = ({
  remainingDuration,
  remainingDistance,
  speed,
  riskIndex,
}) => {
  const {t} = useTranslation();
  const riskColor = getRiskColor(riskIndex);

  return (
    <View style={styles.infoBar}>
      <View style={styles.infoItem}>
        <Text style={styles.infoValue}>
          {formatDuration(remainingDuration)}
        </Text>
        <Text style={styles.infoLabel}>{t('navigation.eta')}</Text>
      </View>
      <View style={styles.infoSeparator} />
      <View style={styles.infoItem}>
        <Text style={styles.infoValue}>
          {formatDistance(remainingDistance)}
        </Text>
        <Text style={styles.infoLabel}>{t('navigation.remaining')}</Text>
      </View>
      <View style={styles.infoSeparator} />
      <View style={styles.infoItem}>
        <Text style={styles.infoValue}>{Math.round(speed)} km/h</Text>
        <Text style={styles.infoLabel}>{t('navigation.speed')}</Text>
      </View>
      {riskIndex >= RISK_WARNING_THRESHOLD && (
        <>
          <View style={styles.infoSeparator} />
          <View style={styles.infoItem}>
            <Text style={[styles.infoValue, {color: riskColor}]}>
              ⚠️ {riskIndex}
            </Text>
            <Text style={styles.infoLabel}>{t('navigation.risk')}</Text>
          </View>
        </>
      )}
    </View>
  );
};

/**
 * NavigationScreen Component
 * Main navigation screen with turn-by-turn directions
 * Requirements: 11.1, 11.2, 11.3
 */
export const NavigationScreen: React.FC<ActiveNavigationScreenProps> = ({
  navigation,
  route: navRoute,
}) => {
  const {t} = useTranslation();
  const mapRef = useRef<MapViewRef>(null);

  // Route params
  const {route: initialRoute} = navRoute.params;

  // Decode route coordinates from polyline
  const routeCoordinates = useMemo(() => {
    if (!initialRoute?.polyline) {
      return [];
    }
    return decodePolyline(initialRoute.polyline);
  }, [initialRoute?.polyline]);

  // Get origin and destination from route
  const origin =
    routeCoordinates.length > 0 ? routeCoordinates[0] : null;
  const destination =
    routeCoordinates.length > 0
      ? routeCoordinates[routeCoordinates.length - 1]
      : null;

  // Navigation store
  const {
    route,
    currentInstruction,
    remainingDistance,
    remainingDuration,
    speed,
    isRecalculating,
    wasRecalculated,
    startSession,
    endSession,
    updatePosition,
    checkForRecalculation,
    clearRecalculationFlag,
  } = useNavigationStore();

  const {stopNavigation, currentPosition} = useMapStore();

  // Voice navigation hook
  // Requirement 15.3: Narrate risk alert when voice is active
  // Requirement 16.5: Narrate route recalculation
  const {
    isEnabled: voiceEnabled,
    toggle: toggleVoice,
    speakRiskAlert,
    speakRecalculating,
    speakInstruction,
    isInitialized: voiceInitialized,
  } = useVoiceNavigation({initialEnabled: true});

  // Risk alerts hook
  // Requirements 15.1, 15.4: Emit Risk_Alert when approaching Risk_Point
  const {
    activeAlert,
    isAlertVisible,
    checkProximity,
    dismissAlert,
    resetAlerts,
  } = useRiskAlerts({
    enabled: true,
    onAlertTriggered: (alert) => {
      // Requirement 15.3: Narrate alert when voice is active
      if (voiceEnabled && voiceInitialized) {
        speakRiskAlert(alert.occurrence.crimeType.name, alert.distance);
      }
    },
  });

  // Convert route occurrences to Occurrence type for risk alerts
  const routeOccurrences = useMemo((): Occurrence[] => {
    if (!initialRoute?.occurrences) {
      return [];
    }
    return initialRoute.occurrences.map((occ) => ({
      id: occ.id,
      timestamp: occ.timestamp,
      location: occ.location,
      crimeType: {
        id: occ.id,
        name: occ.crimeType,
        categoryId: '1',
      },
      severity: (occ.severity as 'low' | 'medium' | 'high' | 'critical') || 'medium',
      confidenceScore: 1,
      source: 'collaborative' as const,
    }));
  }, [initialRoute?.occurrences]);

  // Local state
  const [userHeading, setUserHeading] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Debug: monitor showExitConfirm changes
  useEffect(() => {
    console.log('[NavigationScreen] showExitConfirm changed to:', showExitConfirm);
  }, [showExitConfirm]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [_traveledPath, setTraveledPath] = useState<Coordinates[]>([]);

  // Refs
  const isInitializedRef = useRef(false);
  const lastPositionRef = useRef<Coordinates | null>(null);
  const showExitConfirmRef = useRef(false);

  // User position - prefer GPS, fallback to map store or origin
  const userPosition = currentPosition || origin;

  /**
   * Calculate bearing between two points (in degrees)
   * Requirement 11.3: Align direction of movement to top of screen
   */
  const calculateBearing = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const toDeg = (rad: number) => (rad * 180) / Math.PI;

      const dLon = toRad(lon2 - lon1);
      const lat1Rad = toRad(lat1);
      const lat2Rad = toRad(lat2);

      const y = Math.sin(dLon) * Math.cos(lat2Rad);
      const x =
        Math.cos(lat1Rad) * Math.sin(lat2Rad) -
        Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

      let bearing = toDeg(Math.atan2(y, x));
      return (bearing + 360) % 360;
    },
    [],
  );

  /**
   * Initialize navigation session - runs only once
   * Requirement 11.1: Start Navigation_Mode when user clicks start
   */
  useEffect(() => {
    // Skip if already initialized or if exit modal is showing
    if (isInitializedRef.current || showExitConfirmRef.current) {
      return;
    }
    isInitializedRef.current = true;

    console.log('[NavigationScreen] Initializing navigation session');

    // Start navigation session with initial route
    // Requirement 11.1: Initiate Navigation_Mode
    // Pass route type preference (default to safest)
    startSession(initialRoute, 'safest', destination || undefined);

    // No cleanup that resets isInitializedRef - we want to prevent re-initialization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Speak first instruction when navigation starts
   * Requirement 14.1: Narrate navigation instructions
   */
  useEffect(() => {
    if (voiceInitialized && voiceEnabled && currentInstruction && isMapReady) {
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        console.log('[NavigationScreen] Speaking first instruction:', currentInstruction.text);
        speakInstruction(currentInstruction, currentInstruction.distance);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  // Only run once when voice is initialized and we have the first instruction
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceInitialized, isMapReady]);

  /**
   * Handle route recalculation notification
   * Requirements 16.4, 16.5: Notify user visually and by voice when route is recalculated
   */
  useEffect(() => {
    if (wasRecalculated) {
      console.log('[NavigationScreen] Route was recalculated, notifying user');
      
      // Requirement 16.5: Notify by voice when route is recalculated
      if (voiceEnabled && voiceInitialized) {
        speakRecalculating();
      }
      
      // Clear the flag after notification
      clearRecalculationFlag();
      
      // Update map with new route if available
      if (route && mapRef.current && isMapReady) {
        const newRouteCoordinates = decodePolyline(route.polyline);
        if (newRouteCoordinates.length > 0) {
          mapRef.current.drawRoute(newRouteCoordinates);
        }
      }
    }
  }, [wasRecalculated, voiceEnabled, voiceInitialized, speakRecalculating, clearRecalculationFlag, route, isMapReady]);

  /**
   * Update position tracking
   * Requirement 11.2: Indicate user location in real-time
   * Requirement 16.1, 16.2: Check for route deviation and recalculate
   */
  useEffect(() => {
    if (!currentPosition) return;
    
    // Avoid processing same position twice
    if (lastPositionRef.current && 
        lastPositionRef.current.latitude === currentPosition.latitude &&
        lastPositionRef.current.longitude === currentPosition.longitude) {
      return;
    }

    // Update traveled path for visual differentiation
    // Requirement 12.1, 12.2, 12.3
    setTraveledPath(prev => {
      const newPath = [...prev, currentPosition];
      // Keep only last 1000 points to avoid memory issues
      if (newPath.length > 1000) {
        return newPath.slice(-1000);
      }
      return newPath;
    });

    // Update position in navigation store
    updatePosition(currentPosition);

    // Check proximity to risk points
    // Requirements 15.1, 15.4: Emit Risk_Alert when approaching Risk_Point
    if (routeOccurrences.length > 0) {
      checkProximity(currentPosition, routeOccurrences);
    }

    // Update heading based on movement
    if (lastPositionRef.current) {
      const newHeading = calculateBearing(
        lastPositionRef.current.latitude,
        lastPositionRef.current.longitude,
        currentPosition.latitude,
        currentPosition.longitude,
      );
      
      if (!isNaN(newHeading)) {
        const headingDiff = Math.abs(newHeading - userHeading);
        const normalizedDiff = Math.min(headingDiff, 360 - headingDiff);
        if (normalizedDiff > 10) {
          setUserHeading(newHeading);
        }
      }
    }

    lastPositionRef.current = {
      latitude: currentPosition.latitude,
      longitude: currentPosition.longitude,
    };
  }, [currentPosition, checkProximity, routeOccurrences, calculateBearing, userHeading, updatePosition]);

  /**
   * Check for route deviation periodically
   * Requirement 16.1, 16.2: Check for route deviation and recalculate
   */
  useEffect(() => {
    if (!isMapReady || !currentPosition) return;
    
    const interval = setInterval(() => {
      checkForRecalculation();
    }, 5000); // Check every 5 seconds instead of on every position update
    
    return () => clearInterval(interval);
  }, [isMapReady, currentPosition, checkForRecalculation]);

  /**
   * Update map when position or heading changes
   */
  useEffect(() => {
    if (currentPosition && mapRef.current && isMapReady) {
      mapRef.current.animateToCoordinate(currentPosition);

      if (userHeading !== 0) {
        mapRef.current.setHeading(userHeading);
      }

      mapRef.current.setNavigationMode(true);
      mapRef.current.setCompassMode(true);
    }
  }, [currentPosition, userHeading, isMapReady]);

  /**
   * Handle map ready
   */
  const handleMapReady = useCallback(() => {
    setIsMapReady(true);

    setTimeout(() => {
      if (mapRef.current) {
        if (routeCoordinates.length > 0) {
          mapRef.current.drawRoute(routeCoordinates);
        }

        if (destination) {
          mapRef.current.setDestinationMarker(destination);
        }

        if (userPosition) {
          mapRef.current.animateToCoordinate(userPosition);
        }

        mapRef.current.setNavigationMode(true);
        mapRef.current.setCompassMode(true);

        if (userHeading !== 0) {
          mapRef.current.setHeading(userHeading);
        }
      }
    }, 300);
  }, [routeCoordinates, destination, userPosition, userHeading]);

  /**
   * Handle center map on user
   */
  const handleCenterMap = useCallback(() => {
    if (userPosition && mapRef.current) {
      mapRef.current.animateToCoordinate(userPosition);
    }
  }, [userPosition]);

  /**
   * Handle exit navigation
   */
  const handleExitNavigation = useCallback(() => {
    console.log('[NavigationScreen] handleExitNavigation called - showing confirm modal');
    showExitConfirmRef.current = true;
    setShowExitConfirm(true);
  }, []);

  /**
   * Confirm exit navigation
   * Requirement 17.1, 17.2, 17.3, 17.4
   */
  const confirmExitNavigation = useCallback(() => {
    console.log('[NavigationScreen] confirmExitNavigation called');
    showExitConfirmRef.current = false;
    setShowExitConfirm(false);
    endSession();
    stopNavigation();
    resetAlerts();
    navigation.goBack();
  }, [
    endSession,
    stopNavigation,
    resetAlerts,
    navigation,
  ]);

  /**
   * Cancel exit navigation
   */
  const cancelExitNavigation = useCallback(() => {
    showExitConfirmRef.current = false;
    setShowExitConfirm(false);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background.primary}
      />

      {/* Navigation Banner - Top instruction */}
      {currentInstruction && (
        <NavigationBanner
          instruction={currentInstruction.text}
          distance={currentInstruction.distance}
          maneuver={currentInstruction.maneuver}
        />
      )}

      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          userPosition={userPosition}
          showUserMarker={true}
          followUser={true}
          isNavigating={true}
          userHeading={userHeading}
          compassMode={true}
          destination={destination}
          routeCoordinates={routeCoordinates}
          occurrences={initialRoute?.occurrences}
          onMapReady={handleMapReady}
          style={styles.map}
        />

        {/* Map Control Buttons */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              voiceEnabled && styles.controlButtonActive,
            ]}
            onPress={toggleVoice}
            activeOpacity={0.7}>
            <Text style={styles.controlButtonText}>
              {voiceEnabled ? '🔊' : '🔇'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleCenterMap}
            activeOpacity={0.7}>
            <Text style={styles.controlButtonText}>📍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Info Bar */}
      <NavigationInfoBar
        remainingDuration={remainingDuration}
        remainingDistance={remainingDistance}
        speed={speed}
        riskIndex={route?.maxRiskIndex || 0}
      />

      {/* Exit Navigation Button */}
      <View style={styles.bottomControls}>
        <Button
          variant="primary"
          onPress={handleExitNavigation}
          style={styles.exitButton}
        >
          {t('navigation.endNavigation')}
        </Button>
      </View>

      {/* Risk Alert Banner */}
      {/* Requirement 15.2: Include visual notification on screen */}
      <RiskAlertBanner
        occurrence={activeAlert?.occurrence || null}
        visible={isAlertVisible}
        distance={activeAlert?.distance || null}
        onDismiss={dismissAlert}
        enableVibration={true}
      />

      {/* Recalculating Indicator */}
      {isRecalculating && (
        <View style={styles.recalculatingBanner}>
          <Text style={styles.recalculatingText}>
            {t('navigation.recalculating')}
          </Text>
        </View>
      )}

      {/* Exit Confirmation Modal */}
      <RNModal
        visible={showExitConfirm}
        transparent
        animationType="fade"
        onRequestClose={cancelExitNavigation}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t('navigation.exitConfirmTitle')}</Text>
            <Text style={styles.modalMessage}>{t('navigation.exitConfirmMessage')}</Text>
            <View style={styles.modalButtons}>
              <Button
                variant="outline"
                onPress={cancelExitNavigation}
                style={styles.modalButton}
              >
                {t('common.no')}
              </Button>
              <Button
                variant="primary"
                onPress={confirmExitNavigation}
                style={styles.modalButton}
              >
                {t('common.yes')}
              </Button>
            </View>
          </View>
        </View>
      </RNModal>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  navigationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadows.lg,
  },
  bannerLeft: {
    alignItems: 'center',
    marginRight: spacing.md,
    minWidth: 80,
  },
  bannerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  bannerIcon: {
    fontSize: 40,
    color: '#FFFFFF',
  },
  bannerDistance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bannerRight: {
    flex: 1,
  },
  bannerStreet: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    bottom: spacing.base,
    right: spacing.base,
    gap: spacing.sm,
  },
  controlButton: {
    width: componentSpacing.mapControlSize,
    height: componentSpacing.mapControlSize,
    borderRadius: componentSpacing.mapControlBorderRadius,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  controlButtonActive: {
    backgroundColor: colors.primary.main,
  },
  controlButtonText: {
    fontSize: 24,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.background.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoValue: {
    ...textStyles.h4,
    color: colors.text.primary,
  },
  infoLabel: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  infoSeparator: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.light,
  },
  bottomControls: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    paddingBottom: spacing['2xl'],
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  exitButton: {
    backgroundColor: colors.error.main,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    ...shadows.lg,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalMessage: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
  },
  recalculatingBanner: {
    position: 'absolute',
    top: 60,
    left: spacing.base,
    right: spacing.base,
    backgroundColor: colors.info.main,
    borderRadius: borderRadius.base,
    padding: spacing.sm,
    alignItems: 'center',
    ...shadows.md,
  },
  recalculatingText: {
    ...textStyles.label,
    color: colors.neutral.white,
  },
});

export default NavigationScreen;
