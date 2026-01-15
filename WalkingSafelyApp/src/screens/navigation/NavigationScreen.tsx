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
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {useTranslation} from 'react-i18next';
import {colors, getRiskColor} from '../../theme/colors';
import {
  spacing,
  borderRadius,
  shadows,
  componentSpacing,
} from '../../theme/spacing';
import {textStyles} from '../../theme/typography';
import {MapView, MapViewRef, decodePolyline, splitRouteByPosition} from '../../components/map';
import type {RouteSegmentData} from '../../components/map';
import {Button} from '../../shared/components';
import {RiskAlertBanner} from '../../components/navigation';
import {useNavigationStore} from '../../store/navigationStore';
import {useMapStore} from '../../store/mapStore';
import {useRiskAlerts} from '../../hooks/useRiskAlerts';
import {useVoiceNavigation} from '../../hooks/useVoiceNavigation';
import {RISK_WARNING_THRESHOLD} from '../../utils/constants';
import type {ActiveNavigationScreenProps} from '../../types/navigation';
import type {Coordinates, Occurrence} from '../../types/models';
import {calculateDistance} from '../../utils/geo';

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
    shouldNarrate,
    startSession,
    endSession,
    updatePosition,
    checkForRecalculation,
    clearRecalculationFlag,
    markAsNarrated,
  } = useNavigationStore();

  const {stopNavigation, currentPosition, setCurrentPosition} = useMapStore();

  // Voice navigation hook
  // Requirement 15.3: Narrate risk alert when voice is active
  // Requirement 16.5: Narrate route recalculation
  const {
    isEnabled: voiceEnabled,
    toggle: toggleVoice,
    speakRiskAlert,
    speakRecalculating,
    speakInstruction,
    speakManeuver,
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
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);

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
   * Find the next route point to navigate to and calculate heading
   * This makes the map always show the route direction "up"
   */
  const findNextRoutePointAndHeading = useCallback(
    (position: Coordinates): {nextIndex: number; heading: number} => {
      if (routeCoordinates.length < 2) {
        return {nextIndex: 0, heading: 0};
      }

      // Find the closest point on the route to current position
      let closestIndex = currentRouteIndex;
      let closestDistance = Infinity;

      // Search from current index forward (don't go backwards on the route)
      // Look ahead up to 20 points to find the closest one
      const searchEnd = Math.min(currentRouteIndex + 20, routeCoordinates.length);
      
      for (let i = currentRouteIndex; i < searchEnd; i++) {
        const point = routeCoordinates[i];
        const dist = calculateDistance(position, point);
        
        if (dist < closestDistance) {
          closestDistance = dist;
          closestIndex = i;
        }
      }

      // The next point to navigate to is the one after the closest
      // But we need at least 2 points ahead to calculate a meaningful heading
      let nextIndex = closestIndex;
      
      // If we're very close to the current point (< 15m), move to the next one
      if (closestDistance < 15 && closestIndex < routeCoordinates.length - 1) {
        nextIndex = closestIndex + 1;
      }

      // Find a point far enough ahead to calculate a stable heading
      // Use a point at least 30m ahead, or the next significant turn
      let targetIndex = nextIndex;
      let accumulatedDistance = 0;
      
      for (let i = nextIndex; i < routeCoordinates.length - 1; i++) {
        accumulatedDistance += calculateDistance(routeCoordinates[i], routeCoordinates[i + 1]);
        targetIndex = i + 1;
        
        // Stop when we've accumulated at least 50m of distance
        if (accumulatedDistance >= 50) {
          break;
        }
      }

      // Calculate bearing from current position to the target point
      const targetPoint = routeCoordinates[targetIndex];
      const heading = calculateBearing(
        position.latitude,
        position.longitude,
        targetPoint.latitude,
        targetPoint.longitude,
      );

      console.log('[NavigationScreen] Route heading calculation:', {
        currentIndex: currentRouteIndex,
        closestIndex,
        nextIndex,
        targetIndex,
        closestDistance: closestDistance.toFixed(1),
        heading: heading.toFixed(1),
      });

      return {nextIndex, heading};
    },
    [routeCoordinates, currentRouteIndex, calculateBearing],
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
   * GPS Watch Position - Real-time location and heading tracking
   * Requirement 11.2: Indicate user location in real-time
   * Requirement 11.3: Align direction of movement to top of screen
   */
  useEffect(() => {
    let watchId: number | null = null;

    const startWatching = async () => {
      // Request permission on Android
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('[NavigationScreen] Location permission denied');
            return;
          }
        } catch (err) {
          console.warn('[NavigationScreen] Permission error:', err);
          return;
        }
      }

      // Start watching position with high accuracy for navigation
      watchId = Geolocation.watchPosition(
        (position) => {
          const {latitude, longitude, speed} = position.coords;
          
          console.log('[NavigationScreen] GPS Update - lat:', latitude.toFixed(6), 
            'lng:', longitude.toFixed(6), 
            'speed:', speed);

          // Update position in map store
          setCurrentPosition({latitude, longitude});

          // Note: Heading is now calculated based on route direction, not GPS heading
          // This makes the map always show the route "forward" at the top

          // Update speed in navigation store
          if (speed !== null && speed >= 0) {
            // Convert m/s to km/h
            const speedKmh = speed * 3.6;
            updatePosition({latitude, longitude}, speedKmh);
          } else {
            updatePosition({latitude, longitude});
          }
        },
        (error) => {
          console.warn('[NavigationScreen] GPS Watch error:', error);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 5, // Update every 5 meters
          interval: 1000, // Update every 1 second (Android)
          fastestInterval: 500, // Fastest update interval (Android)
        }
      );

      console.log('[NavigationScreen] GPS Watch started, watchId:', watchId);
    };

    startWatching();

    // Cleanup on unmount
    return () => {
      if (watchId !== null) {
        console.log('[NavigationScreen] Stopping GPS watch');
        Geolocation.clearWatch(watchId);
      }
    };
  }, [setCurrentPosition, updatePosition]);

  /**
   * Speak first instruction when navigation starts
   * Requirement 14.1: Narrate navigation instructions
   */
  const hasSpokenFirstInstruction = useRef(false);
  
  useEffect(() => {
    if (voiceInitialized && voiceEnabled && currentInstruction && isMapReady && !hasSpokenFirstInstruction.current) {
      hasSpokenFirstInstruction.current = true;
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        console.log('[NavigationScreen] Speaking first instruction:', currentInstruction.text);
        speakInstruction(currentInstruction, currentInstruction.distance);
        markAsNarrated();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  // Only run once when voice is initialized and we have the first instruction
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceInitialized, isMapReady]);

  /**
   * Speak instruction when approaching (30m threshold) or when advancing to new instruction
   * Requirement 14.4: Narrate instructions with adequate advance notice
   */
  useEffect(() => {
    console.log('[NavigationScreen] Narration check - shouldNarrate:', shouldNarrate, 
      'voiceEnabled:', voiceEnabled, 'voiceInitialized:', voiceInitialized, 
      'hasInstruction:', !!currentInstruction);
    
    if (shouldNarrate && currentInstruction) {
      if (!voiceEnabled || !voiceInitialized) {
        // Debug: show why narration didn't happen
        console.log('[NavigationScreen] Narration blocked - voiceEnabled:', voiceEnabled, 'voiceInitialized:', voiceInitialized);
        // Still mark as narrated to avoid repeated attempts
        markAsNarrated();
        return;
      }
      
      console.log('[NavigationScreen] Narrating instruction:', currentInstruction.text, 'distance:', currentInstruction.distance);
      speakManeuver(
        currentInstruction.maneuver,
        currentInstruction.distance,
        currentInstruction.text,
        true // forceSpeak - bypass time/distance checks when advancing to new instruction
      );
      markAsNarrated();
    }
  }, [shouldNarrate, voiceEnabled, voiceInitialized, currentInstruction, speakManeuver, markAsNarrated]);

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
   * Update position tracking and calculate heading based on route direction
   * Requirement 11.2: Indicate user location in real-time
   * Requirement 11.3: Align direction of movement to top of screen (route direction)
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

    // Check proximity to risk points
    // Requirements 15.1, 15.4: Emit Risk_Alert when approaching Risk_Point
    if (routeOccurrences.length > 0) {
      checkProximity(currentPosition, routeOccurrences);
    }

    // Calculate heading based on route direction (next point on route)
    // This makes the map always show the route "forward" direction at the top
    if (routeCoordinates.length >= 2) {
      const {nextIndex, heading} = findNextRoutePointAndHeading(currentPosition);
      
      // Update current route index for tracking progress
      if (nextIndex > currentRouteIndex) {
        setCurrentRouteIndex(nextIndex);
      }
      
      // Update heading if we got a valid one
      if (heading > 0 && !isNaN(heading)) {
        setUserHeading(heading);
      }
    }

    lastPositionRef.current = {
      latitude: currentPosition.latitude,
      longitude: currentPosition.longitude,
    };
  }, [currentPosition, checkProximity, routeOccurrences, routeCoordinates, findNextRoutePointAndHeading, currentRouteIndex]);

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

      // Only set heading if we have a valid non-zero heading
      // This prevents the map from rotating incorrectly
      if (userHeading > 0) {
        mapRef.current.setHeading(userHeading);
      }

      mapRef.current.setNavigationMode(true);
      mapRef.current.setCompassMode(true);
    }
  }, [currentPosition, userHeading, isMapReady]);

  /**
   * Update route segments with different colors for traveled vs remaining
   * Requirements 12.1, 12.2, 12.3: Visual differentiation of route segments
   */
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !currentPosition || routeCoordinates.length < 2) {
      return;
    }

    // Split route into traveled and remaining segments
    const {traveledSegment, remainingSegment} = splitRouteByPosition(
      routeCoordinates,
      currentPosition,
    );

    // Build segments array for drawing
    const segments: RouteSegmentData[] = [];

    // Add traveled segment (gray-blue) if it has enough points
    if (traveledSegment.coordinates.length >= 2) {
      segments.push({
        coordinates: traveledSegment.coordinates,
        color: traveledSegment.color, // #78909C
      });
    }

    // Add remaining segment (blue) if it has enough points
    if (remainingSegment.coordinates.length >= 2) {
      segments.push({
        coordinates: remainingSegment.coordinates,
        color: remainingSegment.color, // #2196F3
      });
    }

    // Draw segmented route if we have segments
    if (segments.length > 0) {
      mapRef.current.drawSegmentedRoute(segments);
    }
  }, [isMapReady, currentPosition, routeCoordinates]);

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

        // Calculate initial heading based on route direction (first segment)
        // This ensures the map points "forward" along the route from the start
        if (routeCoordinates.length >= 2) {
          // Use a point further along the route for more stable initial heading
          const startPoint = routeCoordinates[0];
          let targetIndex = Math.min(5, routeCoordinates.length - 1); // Look at least 5 points ahead
          
          // Find a point at least 50m ahead for stable heading
          let accumulatedDistance = 0;
          for (let i = 0; i < routeCoordinates.length - 1; i++) {
            accumulatedDistance += calculateDistance(routeCoordinates[i], routeCoordinates[i + 1]);
            if (accumulatedDistance >= 50) {
              targetIndex = i + 1;
              break;
            }
          }
          
          const targetPoint = routeCoordinates[targetIndex];
          const initialHeading = calculateBearing(
            startPoint.latitude,
            startPoint.longitude,
            targetPoint.latitude,
            targetPoint.longitude,
          );
          
          console.log('[NavigationScreen] Setting initial route heading:', initialHeading, 'target index:', targetIndex);
          setUserHeading(initialHeading);
          mapRef.current.setHeading(initialHeading);
        }

        if (userPosition) {
          mapRef.current.animateToCoordinate(userPosition);
        }

        mapRef.current.setNavigationMode(true);
        mapRef.current.setCompassMode(true);
      }
    }, 300);
  }, [routeCoordinates, destination, userPosition, calculateBearing]);

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
