/**
 * ActiveNavigationScreen
 * Turn-by-turn navigation screen with real-time updates
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.7, 15.5
 */

import React, {useRef, useCallback, useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
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
import {MapView, MapViewRef} from '../../components/map/MapView';
import {decodePolyline} from '../../components/map/RoutePolyline';
import {Button} from '../../components/common/Button';
import {Modal} from '../../components/common/Modal';
import {RiskAlertBanner} from '../../components/navigation/RiskAlertBanner';
import {useNavigationStore} from '../../store/navigationStore';
import {useMapStore} from '../../store/mapStore';
import {usePreferencesStore} from '../../store/preferencesStore';
import {useLocation} from '../../hooks/useLocation';
import {useAlerts} from '../../hooks/useAlerts';
import {useBackground} from '../../hooks/useBackground';
import {alertService} from '../../services/alerts';
import {ttsService} from '../../services/tts';
import {
  TRAFFIC_UPDATE_INTERVAL,
  RISK_WARNING_THRESHOLD,
} from '../../utils/constants';
import type {ActiveNavigationScreenProps} from '../../types/navigation';
import type {RouteResponse} from '../../types/models';

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
 * Get maneuver description using translations
 */
const getManeuverDescription = (maneuver: string): string => {
  const {t} = useTranslation();
  
  switch (maneuver) {
    case 'turn-left':
      return t('navigation.instructions.turnLeft');
    case 'turn-right':
      return t('navigation.instructions.turnRight');
    case 'turn-slight-left':
      return t('navigation.instructions.turnSlightLeft');
    case 'turn-slight-right':
      return t('navigation.instructions.turnSlightRight');
    case 'turn-sharp-left':
      return t('navigation.instructions.turnSharpLeft');
    case 'turn-sharp-right':
      return t('navigation.instructions.turnSharpRight');
    case 'uturn-left':
      return t('navigation.instructions.uturnLeft');
    case 'uturn-right':
      return t('navigation.instructions.uturnRight');
    case 'uturn':
      return t('navigation.instructions.uturn');
    case 'straight':
      return t('navigation.instructions.straight');
    case 'merge':
      return t('navigation.instructions.merge');
    case 'ramp-left':
      return t('navigation.instructions.rampLeft');
    case 'ramp-right':
      return t('navigation.instructions.rampRight');
    case 'fork-left':
      return t('navigation.instructions.forkLeft');
    case 'fork-right':
      return t('navigation.instructions.forkRight');
    case 'roundabout-left':
      return t('navigation.instructions.roundaboutLeft');
    case 'roundabout-right':
      return t('navigation.instructions.roundaboutRight');
    case 'roundabout':
      return t('navigation.instructions.roundabout');
    case 'arrive':
      return t('navigation.instructions.arrive');
    case 'depart':
      return t('navigation.instructions.depart');
    default:
      return t('navigation.instructions.continue');
  }
};

/**
 * Get background color based on maneuver type
 */
const getManeuverColor = (maneuver: string): string => {
  if (maneuver.includes('left')) return '#2563EB'; // Blue for left
  if (maneuver.includes('right')) return '#059669'; // Green for right
  if (maneuver === 'arrive') return '#7C3AED'; // Purple for arrival
  if (maneuver === 'straight') return '#0891B2'; // Cyan for straight
  return '#2563EB'; // Default blue
};

/**
 * Navigation Banner Component - Top of screen instruction popup
 * Shows the next maneuver with large icon and distance
 */
interface NavigationBannerProps {
  instruction: string;
  distance: number;
  maneuver: string;
  streetName?: string;
}

const NavigationBanner: React.FC<NavigationBannerProps> = ({
  instruction,
  distance,
  maneuver,
  streetName,
}) => {
  const maneuverColor = getManeuverColor(maneuver);
  const maneuverDesc = getManeuverDescription(maneuver);
  
  // Extract street name from instruction if not provided
  const displayStreet = streetName || instruction;
  
  return (
    <View style={[styles.navigationBanner, {backgroundColor: maneuverColor}]}>
      <View style={styles.bannerLeft}>
        <View style={styles.bannerIconContainer}>
          <Text style={styles.bannerIcon}>{getManeuverIcon(maneuver)}</Text>
        </View>
        <Text style={styles.bannerDistance}>{formatDistance(distance)}</Text>
      </View>
      <View style={styles.bannerRight}>
        <Text style={styles.bannerManeuver}>{maneuverDesc}</Text>
        <Text style={styles.bannerStreet} numberOfLines={2}>{displayStreet}</Text>
      </View>
    </View>
  );
};

/**
 * Instruction Card Component (secondary, below banner)
 * Requirement 6.2: Display next direction instruction
 */
interface InstructionCardProps {
  instruction: string;
  distance: number;
  maneuver: string;
}

const InstructionCard: React.FC<InstructionCardProps> = ({
  instruction,
  distance,
  maneuver,
}) => (
  <View style={styles.instructionCard}>
    <View style={styles.instructionIconContainer}>
      <Text style={styles.instructionIcon}>{getManeuverIcon(maneuver)}</Text>
    </View>
    <View style={styles.instructionContent}>
      <Text style={styles.instructionText} numberOfLines={2}>
        {instruction}
      </Text>
      <Text style={styles.instructionDistance}>{formatDistance(distance)}</Text>
    </View>
  </View>
);

/**
 * Navigation Info Bar Component
 * Requirement 6.4: Display ETA and remaining distance
 */
interface NavigationInfoBarProps {
  remainingDuration: number;
  remainingDistance: number;
  speed: number;
  riskIndex: number;
  onRiskPress?: () => void;
}

const NavigationInfoBar: React.FC<NavigationInfoBarProps> = ({
  remainingDuration,
  remainingDistance,
  speed,
  riskIndex,
  onRiskPress,
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
          <TouchableOpacity style={styles.infoItem} onPress={onRiskPress} activeOpacity={0.7}>
            <Text style={[styles.infoValue, {color: riskColor}]}>
              ⚠️ {riskIndex}
            </Text>
            <Text style={styles.infoLabel}>{t('navigation.risk')}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

/**
 * Risk Details Modal Component
 * Shows occurrences that contributed to the risk index
 */
interface RiskDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  riskIndex: number;
  occurrences?: Array<{
    id: string;
    location: { latitude: number; longitude: number };
    crimeType: string;
    severity: string;
  }>;
}

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical': return colors.error.main;
    case 'high': return '#EA580C';
    case 'medium': return colors.warning.main;
    case 'low': return colors.success.main;
    default: return colors.warning.main;
  }
};

const getSeverityLabel = (severity: string): string => {
  switch (severity) {
    case 'critical': return 'Crítico';
    case 'high': return 'Alto';
    case 'medium': return 'Médio';
    case 'low': return 'Baixo';
    default: return severity;
  }
};

const RiskDetailsModal: React.FC<RiskDetailsModalProps> = ({
  visible,
  onClose,
  riskIndex,
  occurrences = [],
}) => {
  const {t} = useTranslation();
  const riskColor = getRiskColor(riskIndex);

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={t('navigation.riskDetails') || 'Detalhes do Risco'}
      size="medium">
      <View style={styles.riskModalContent}>
        <View style={styles.riskScoreContainer}>
          <Text style={[styles.riskScoreValue, {color: riskColor}]}>{riskIndex}</Text>
          <Text style={styles.riskScoreLabel}>{t('navigation.riskIndex') || 'Índice de Risco'}</Text>
        </View>
        
        <Text style={styles.riskSectionTitle}>
          {t('navigation.occurrencesOnRoute') || 'Ocorrências na Rota'} ({occurrences.length})
        </Text>
        
        {occurrences.length === 0 ? (
          <Text style={styles.noOccurrencesText}>
            {t('navigation.noOccurrences') || 'Nenhuma ocorrência registrada nesta rota'}
          </Text>
        ) : (
          <View style={styles.occurrencesList}>
            {occurrences.map((occ, index) => (
              <View key={occ.id || index} style={styles.occurrenceItem}>
                <View style={[styles.occurrenceSeverityBadge, {backgroundColor: getSeverityColor(occ.severity)}]}>
                  <Text style={styles.occurrenceSeverityText}>⚠️</Text>
                </View>
                <View style={styles.occurrenceInfo}>
                  <Text style={styles.occurrenceCrimeType}>{occ.crimeType}</Text>
                  <Text style={styles.occurrenceSeverityLabel}>
                    Severidade: {getSeverityLabel(occ.severity)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
        
        <Button
          title={t('common.close') || 'Fechar'}
          variant="outline"
          onPress={onClose}
          style={styles.riskModalButton}
        />
      </View>
    </Modal>
  );
};

/**
 * Route Comparison Modal Component
 * Requirements: 8.2, 8.3, 8.4
 */
interface RouteComparisonModalProps {
  visible: boolean;
  currentRoute: RouteResponse | null;
  alternativeRoute: RouteResponse | null;
  onAccept: () => void;
  onReject: () => void;
}

const RouteComparisonModal: React.FC<RouteComparisonModalProps> = ({
  visible,
  currentRoute,
  alternativeRoute,
  onAccept,
  onReject,
}) => {
  const {t} = useTranslation();

  if (!currentRoute || !alternativeRoute) {
    return null;
  }

  const timeDiff = alternativeRoute.duration - currentRoute.duration;
  const distDiff = alternativeRoute.distance - currentRoute.distance;
  const riskDiff = alternativeRoute.maxRiskIndex - currentRoute.maxRiskIndex;

  return (
    <Modal
      visible={visible}
      onClose={onReject}
      title={t('navigation.alternativeRouteFound')}
      size="medium">
      <View style={styles.comparisonContainer}>
        <View style={styles.comparisonRow}>
          <Text style={styles.comparisonLabel}>
            {t('navigation.timeDifference')}
          </Text>
          <Text
            style={[
              styles.comparisonValue,
              timeDiff < 0 && styles.comparisonPositive,
            ]}>
            {timeDiff < 0 ? '-' : '+'}
            {formatDuration(Math.abs(timeDiff))}
          </Text>
        </View>
        <View style={styles.comparisonRow}>
          <Text style={styles.comparisonLabel}>
            {t('navigation.distanceDifference')}
          </Text>
          <Text style={styles.comparisonValue}>
            {distDiff < 0 ? '-' : '+'}
            {formatDistance(Math.abs(distDiff))}
          </Text>
        </View>
        <View style={styles.comparisonRow}>
          <Text style={styles.comparisonLabel}>
            {t('navigation.riskDifference')}
          </Text>
          <Text
            style={[
              styles.comparisonValue,
              riskDiff < 0 && styles.comparisonPositive,
            ]}>
            {riskDiff < 0 ? '' : '+'}
            {riskDiff}
          </Text>
        </View>
      </View>
      <View style={styles.comparisonActions}>
        <Button
          title={t('common.reject')}
          variant="outline"
          onPress={onReject}
          style={styles.comparisonButton}
        />
        <Button
          title={t('common.accept')}
          variant="primary"
          onPress={onAccept}
          style={styles.comparisonButton}
        />
      </View>
    </Modal>
  );
};

/**
 * ActiveNavigationScreen Component
 * Main navigation screen with turn-by-turn directions
 */
export const ActiveNavigationScreen: React.FC<ActiveNavigationScreenProps> = ({
  navigation,
  route: navRoute,
}) => {
  const {t} = useTranslation();
  const mapRef = useRef<MapViewRef>(null);

  // Route params - get origin and destination from navigation params
  const {route: initialRoute, sessionId: initialSessionId} = navRoute.params;
  
  // Decode route coordinates from polyline
  const routeCoordinates = React.useMemo(() => {
    if (!initialRoute?.polyline) {
      console.log('[ActiveNavigation] No polyline in route');
      return [];
    }
    const decoded = decodePolyline(initialRoute.polyline);
    console.log('[ActiveNavigation] Decoded route coordinates:', decoded.length);
    return decoded;
  }, [initialRoute?.polyline]);

  // Get origin (first point) and destination (last point) from route
  const origin = routeCoordinates.length > 0 ? routeCoordinates[0] : null;
  const destination = routeCoordinates.length > 0 ? routeCoordinates[routeCoordinates.length - 1] : null;

  // Stores
  const {
    route,
    sessionId,
    currentInstruction,
    remainingDistance,
    remainingDuration,
    speed,
    pendingAlternativeRoute,
    isRecalculating,
    startSession,
    endSession,
    updatePosition,
    checkForRecalculation,
    checkTrafficUpdate,
    acceptAlternativeRoute,
    rejectAlternativeRoute,
  } = useNavigationStore();

  const {stopNavigation, currentPosition} = useMapStore();
  const {soundEnabled} = usePreferencesStore();

  // Background service for resource management
  // Requirement 15.5: Manage GPS and wake lock in background
  // isNavigationMode: true automatically manages setNavigationActive
  const {activateWakeLock, deactivateWakeLock} =
    useBackground({
      isNavigationMode: true,
      onEnterBackground: () => {
        console.log(
          '[ActiveNavigation] App went to background, keeping resources active',
        );
      },
      onEnterForeground: () => {
        console.log('[ActiveNavigation] App came to foreground');
      },
    });

  // Location tracking
  const {coordinates, position, startTracking, stopTracking, hasPermission} =
    useLocation({
      autoStartTracking: false,
      updateMapStore: true,
      watchOptions: {
        enableHighAccuracy: true,
        distanceFilter: 5, // More frequent updates during navigation
        timeout: 15000,
        maximumAge: 5000,
      },
    });

  // Use current GPS position, or fall back to origin if not available yet
  const userPosition = coordinates || currentPosition || origin;

  // Alerts
  const {currentAlert, isAlertActive, distanceToRisk, dismissAlert} = useAlerts(
    {
      autoCheck: true,
      checkInterval: 1000,
      autoDismissAfter: 10000, // Auto-dismiss after 10 seconds
    },
  );

  // Local state
  const [userHeading, setUserHeading] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showAlternativeModal, setShowAlternativeModal] = useState(false);
  const [showRiskDetailsModal, setShowRiskDetailsModal] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Refs
  const trafficCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const lastSpokenInstructionRef = useRef<string | null>(null);
  const lastPositionRef = useRef<{latitude: number; longitude: number} | null>(null);

  /**
   * Calculate bearing between two points (in degrees)
   * Returns the direction from point1 to point2
   */
  const calculateBearing = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (deg: number) => deg * Math.PI / 180;
    const toDeg = (rad: number) => rad * 180 / Math.PI;
    
    const dLon = toRad(lon2 - lon1);
    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    let bearing = toDeg(Math.atan2(y, x));
    return (bearing + 360) % 360; // Normalize to 0-360
  }, []);

  /**
   * Find the next point on the route ahead of current position
   */
  const findNextRoutePoint = useCallback((currentLat: number, currentLon: number): {latitude: number; longitude: number} | null => {
    if (!routeCoordinates || routeCoordinates.length < 2) return null;
    
    // Find the closest point on the route
    let minDist = Infinity;
    let closestIndex = 0;
    
    for (let i = 0; i < routeCoordinates.length; i++) {
      const point = routeCoordinates[i];
      const dist = Math.sqrt(
        Math.pow(point.latitude - currentLat, 2) + 
        Math.pow(point.longitude - currentLon, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }
    
    // Return the next point (or a point a few steps ahead for smoother direction)
    const lookAhead = Math.min(closestIndex + 3, routeCoordinates.length - 1);
    return routeCoordinates[lookAhead];
  }, [routeCoordinates]);

  /**
   * Initialize navigation session - runs only once
   */
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    console.log('[ActiveNavigation] Initializing navigation session');
    console.log('[ActiveNavigation] Route coordinates count:', routeCoordinates.length);
    console.log('[ActiveNavigation] Origin:', origin);
    console.log('[ActiveNavigation] Destination:', destination);
    
    // Initialize TTS
    ttsService.init().then(() => {
      if (voiceEnabled) {
        const message = t('navigation.instructions.navigationStarted');
        ttsService.speak(message);
      }
    });
    
    // Start navigation session with initial route
    startSession(initialRoute);

    // Start location tracking
    if (hasPermission) {
      startTracking();
    }

    // Activate wake lock
    // Requirement 6.7: Keep screen on during navigation
    // Note: setNavigationActive is handled by useBackground with isNavigationMode: true
    activateWakeLock();

    return () => {
      console.log('[ActiveNavigation] Cleaning up navigation session');
      // Cleanup on unmount
      stopTracking();
      deactivateWakeLock();
      ttsService.stop();
      isInitializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run only once on mount

  /**
   * Handle map ready - center on user and draw route
   */
  const handleMapReady = useCallback(() => {
    console.log('[ActiveNavigation] Map is ready');
    setIsMapReady(true);
  }, []);

  /**
   * Center map on user when map is ready and we have position
   */
  useEffect(() => {
    if (isMapReady && userPosition && mapRef.current) {
      console.log('[ActiveNavigation] Centering map on user:', userPosition);
      mapRef.current.animateToCoordinate(userPosition, 500);
    }
  }, [isMapReady, userPosition]);

  /**
   * Update position in navigation store when location changes
   * Requirement 6.3: Update position in real-time
   */
  useEffect(() => {
    if (coordinates && position) {
      const currentSpeed = position.speed ? position.speed * 3.6 : 0; // Convert m/s to km/h
      updatePosition(coordinates, currentSpeed);

      // Determine heading - prefer GPS heading, fallback to route-based bearing
      let newHeading: number | null = null;
      
      if (position.heading !== undefined && position.heading !== null && position.heading >= 0) {
        // Use GPS heading when available and valid
        newHeading = position.heading;
      } else {
        // Calculate heading based on route direction
        const nextPoint = findNextRoutePoint(coordinates.latitude, coordinates.longitude);
        if (nextPoint) {
          newHeading = calculateBearing(
            coordinates.latitude, 
            coordinates.longitude, 
            nextPoint.latitude, 
            nextPoint.longitude
          );
        }
      }
      
      // Update heading if we have a valid value and it changed significantly
      if (newHeading !== null && !isNaN(newHeading)) {
        // Only update if heading changed by more than 5 degrees to avoid jitter
        const headingDiff = Math.abs(newHeading - userHeading);
        if (headingDiff > 5 || headingDiff > 355) {
          setUserHeading(newHeading);
        }
      }
      
      // Store current position for next calculation
      lastPositionRef.current = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };
      
      // Center map on user position during navigation
      if (mapRef.current) {
        mapRef.current.animateToCoordinate(coordinates, 300);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates, position, updatePosition]);

  /**
   * Check for route recalculation when position changes
   * Requirement 6.5: Automatic recalculation when user deviates
   */
  useEffect(() => {
    if (coordinates && sessionId) {
      checkForRecalculation();
    }
  }, [coordinates, sessionId, checkForRecalculation]);

  /**
   * Set up traffic update interval
   * Requirement 8.1: Check traffic every 60 seconds
   */
  useEffect(() => {
    if (sessionId) {
      trafficCheckIntervalRef.current = setInterval(() => {
        checkTrafficUpdate();
      }, TRAFFIC_UPDATE_INTERVAL);
    }

    return () => {
      if (trafficCheckIntervalRef.current) {
        clearInterval(trafficCheckIntervalRef.current);
        trafficCheckIntervalRef.current = null;
      }
    };
  }, [sessionId, checkTrafficUpdate]);

  /**
   * Show alternative route modal when available
   */
  useEffect(() => {
    if (pendingAlternativeRoute) {
      setShowAlternativeModal(true);
    }
  }, [pendingAlternativeRoute]);

  /**
   * Center map on user position
   */
  const handleCenterMap = useCallback(() => {
    console.log('[ActiveNavigation] handleCenterMap called, userPosition:', userPosition);
    if (userPosition && mapRef.current) {
      mapRef.current.animateToCoordinate(userPosition, 500);
    }
  }, [userPosition]);

  /**
   * Handle exit navigation
   */
  const handleExitNavigation = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  /**
   * Confirm exit navigation
   */
  const confirmExitNavigation = useCallback(() => {
    setShowExitConfirm(false);
    endSession();
    stopNavigation();
    // Deactivate wake lock - navigation mode will be deactivated by useBackground cleanup
    deactivateWakeLock();
    navigation.goBack();
  }, [
    endSession,
    stopNavigation,
    navigation,
    deactivateWakeLock,
  ]);

  /**
   * Cancel exit navigation
   */
  const cancelExitNavigation = useCallback(() => {
    setShowExitConfirm(false);
  }, []);

  /**
   * Handle accept alternative route
   * Requirement 8.5: Update route when user accepts
   */
  const handleAcceptAlternative = useCallback(() => {
    acceptAlternativeRoute();
    setShowAlternativeModal(false);
  }, [acceptAlternativeRoute]);

  /**
   * Handle reject alternative route
   */
  const handleRejectAlternative = useCallback(() => {
    rejectAlternativeRoute();
    setShowAlternativeModal(false);
  }, [rejectAlternativeRoute]);

  /**
   * Handle risk indicator press - show risk details modal
   */
  const handleRiskPress = useCallback(() => {
    setShowRiskDetailsModal(true);
  }, []);

  /**
   * Speak navigation instruction when it changes
   */
  useEffect(() => {
    if (!voiceEnabled || !currentInstruction) return;
    
    // Create a unique key for this instruction
    const instructionKey = `${currentInstruction.maneuver}-${currentInstruction.distance}-${currentInstruction.text}`;
    
    // Only speak if instruction changed
    if (lastSpokenInstructionRef.current !== instructionKey) {
      lastSpokenInstructionRef.current = instructionKey;
      
      // Speak at certain distance thresholds
      const distance = currentInstruction.distance;
      if (distance <= 50 || distance <= 100 || distance <= 200 || distance <= 500) {
        ttsService.speakManeuver(
          currentInstruction.maneuver,
          distance,
          currentInstruction.text
        );
      }
    }
  }, [voiceEnabled, currentInstruction]);

  /**
   * Speak when recalculating
   */
  useEffect(() => {
    if (isRecalculating && voiceEnabled) {
      ttsService.speakRecalculating();
    }
  }, [isRecalculating, voiceEnabled]);

  /**
   * Play alert sound and speak when alert is shown
   * Requirement 7.2: Play notification sound
   */
  useEffect(() => {
    if (isAlertActive && soundEnabled) {
      alertService.playAlertSound();
    }
    if (isAlertActive && voiceEnabled && currentAlert) {
      ttsService.speakRiskAlert(
        currentAlert.crimeType || 'Ocorrência',
        distanceToRisk || 100
      );
    }
  }, [isAlertActive, soundEnabled, voiceEnabled, currentAlert, distanceToRisk]);

  // Get destination from route
  // Use decoded destination, not from instructions (which may be empty)

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background.primary}
      />

      {/* Navigation Banner - Top instruction popup */}
      {currentInstruction && (
        <NavigationBanner
          instruction={currentInstruction.text}
          distance={currentInstruction.distance}
          maneuver={currentInstruction.maneuver}
        />
      )}

      {/* Map View - Requirement 6.1: Rotated map in direction of movement */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          userPosition={userPosition}
          showUserMarker={true}
          followUser={true}
          isNavigating={true}
          userHeading={userHeading}
          destination={destination}
          routeCoordinates={routeCoordinates}
          occurrences={initialRoute?.occurrences}
          onMapReady={handleMapReady}
          style={styles.map}
        />

        {/* Map Control Buttons */}
        <View style={styles.mapControls}>
          {/* Voice Toggle Button */}
          <TouchableOpacity
            style={[styles.controlButton, voiceEnabled && styles.controlButtonActive]}
            onPress={() => setVoiceEnabled(!voiceEnabled)}
            activeOpacity={0.7}>
            <Text style={styles.controlButtonText}>{voiceEnabled ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>

          {/* Center Map Button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleCenterMap}
            activeOpacity={0.7}>
            <Text style={styles.controlButtonText}>📍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Info Bar - Requirement 6.4: Display ETA and distance */}
      <NavigationInfoBar
        remainingDuration={remainingDuration}
        remainingDistance={remainingDistance}
        speed={speed}
        riskIndex={route?.maxRiskIndex || 0}
        onRiskPress={handleRiskPress}
      />

      {/* Exit Navigation Button - Requirement 6.6: Button to end navigation */}
      <View style={styles.bottomControls}>
        <Button
          title={t('navigation.endNavigation')}
          variant="danger"
          onPress={handleExitNavigation}
          fullWidth
        />
      </View>

      {/* Risk Alert - Requirements 7.1, 7.2, 7.3 */}
      <RiskAlertBanner
        alert={currentAlert}
        visible={isAlertActive}
        distanceToRisk={distanceToRisk}
        onDismiss={dismissAlert}
        enableVibration={soundEnabled}
      />

      {/* Recalculating Indicator */}
      {isRecalculating && (
        <View style={styles.recalculatingBanner}>
          <Text style={styles.recalculatingText}>
            {t('navigation.recalculating')}
          </Text>
        </View>
      )}

      {/* Alternative Route Modal - Requirements 8.2, 8.3, 8.4 */}
      <RouteComparisonModal
        visible={showAlternativeModal}
        currentRoute={route}
        alternativeRoute={pendingAlternativeRoute}
        onAccept={handleAcceptAlternative}
        onReject={handleRejectAlternative}
      />

      {/* Exit Confirmation Modal */}
      <Modal
        visible={showExitConfirm}
        onClose={cancelExitNavigation}
        title={t('navigation.exitConfirmTitle')}
        message={t('navigation.exitConfirmMessage')}
        primaryAction={{
          label: t('common.yes'),
          onPress: confirmExitNavigation,
          variant: 'danger',
        }}
        secondaryAction={{
          label: t('common.no'),
          onPress: cancelExitNavigation,
        }}
      />

      {/* Risk Details Modal */}
      <RiskDetailsModal
        visible={showRiskDetailsModal}
        onClose={() => setShowRiskDetailsModal(false)}
        riskIndex={route?.maxRiskIndex || 0}
        occurrences={initialRoute?.occurrences}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  
  // Navigation Banner - Top instruction popup
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
  bannerManeuver: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
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

  // Instruction Card (legacy, kept for compatibility)
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.lg,
  },
  instructionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  instructionIcon: {
    fontSize: 28,
    color: colors.primary.contrast,
  },
  instructionContent: {
    flex: 1,
  },
  instructionText: {
    ...textStyles.h5,
    color: colors.primary.contrast,
    marginBottom: spacing.xs,
  },
  instructionDistance: {
    ...textStyles.body,
    color: colors.primary.light,
  },

  // Navigation Info Bar
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

  // Bottom Controls
  bottomControls: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    paddingBottom: spacing['2xl'],
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },

  // Recalculating Banner
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

  // Route Comparison Modal
  comparisonContainer: {
    marginBottom: spacing.lg,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  comparisonLabel: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  comparisonValue: {
    ...textStyles.h5,
    color: colors.text.primary,
  },
  comparisonPositive: {
    color: colors.success.main,
  },
  comparisonActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  comparisonButton: {
    flex: 1,
  },

  // Risk Details Modal
  riskModalContent: {
    paddingVertical: spacing.sm,
  },
  riskScoreContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.base,
  },
  riskScoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  riskScoreLabel: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  riskSectionTitle: {
    ...textStyles.h5,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  noOccurrencesText: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  occurrencesList: {
    maxHeight: 250,
  },
  occurrenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  occurrenceSeverityBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  occurrenceSeverityText: {
    fontSize: 16,
  },
  occurrenceInfo: {
    flex: 1,
  },
  occurrenceCrimeType: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  occurrenceSeverityLabel: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  riskModalButton: {
    marginTop: spacing.lg,
  },
});

export default ActiveNavigationScreen;
