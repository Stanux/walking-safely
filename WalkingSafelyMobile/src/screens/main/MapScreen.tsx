/**
 * Map Screen
 * Main map view with user location, search, heatmap toggle, and navigation features
 * Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 9.1, 9.4, 9.5
 */

import React, {useRef, useCallback, useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useFocusEffect} from '@react-navigation/native';
import {Region} from 'react-native-maps';
import {colors} from '../../theme/colors';
import {spacing, componentSpacing, shadows} from '../../theme/spacing';
import {textStyles} from '../../theme/typography';
import {MapView, MapViewRef} from '../../components/map/MapView';
import {SearchBar} from '../../components/map/SearchBar';
import {HeatmapLayer} from '../../components/map/HeatmapLayer';
import {RoutePolyline} from '../../components/map/RoutePolyline';
import {HeatmapFiltersModal} from '../../components/map/HeatmapFilters';
import {useLocation} from '../../hooks/useLocation';
import {useMapStore} from '../../store/mapStore';
import {useAuthStore} from '../../store/authStore';
import {useNetworkContext} from '../../contexts';
import {heatmapService} from '../../services/api/heatmap';
import {occurrencesService} from '../../services/api/occurrences';
import {Address, MapBounds, HeatmapFilters, Coordinates} from '../../types/models';
import type {MapHomeScreenProps} from '../../types/navigation';
import {DEBOUNCE_DELAY} from '../../utils/constants';

/**
 * Floating Action Button Component
 */
interface FABProps {
  icon: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
}

const FAB: React.FC<FABProps> = ({
  icon,
  onPress,
  active = false,
  disabled = false,
  accessibilityLabel,
}) => (
  <TouchableOpacity
    style={[
      styles.fab,
      active && styles.fabActive,
      disabled && styles.fabDisabled,
    ]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{disabled, selected: active}}>
    <Text style={[styles.fabIcon, active && styles.fabIconActive]}>{icon}</Text>
  </TouchableOpacity>
);

/**
 * MapScreen Component
 * Main map view with search, location tracking, and heatmap overlay
 */
export const MapScreen: React.FC<MapHomeScreenProps> = ({navigation}) => {
  const {t} = useTranslation();
  const mapRef = useRef<MapViewRef>(null);

  // Location hook
  const {
    coordinates,
    position,
    hasPermission,
    isLoading: isLocationLoading,
    error: locationError,
    requestPermission,
    getCurrentPosition,
  } = useLocation({
    autoRequestPermission: true,
    autoStartTracking: true,
    updateMapStore: true,
  });

  // Debug log for coordinates
  useEffect(() => {
    console.log('[MapScreen] coordinates:', coordinates);
    console.log('[MapScreen] hasPermission:', hasPermission);
    console.log('[MapScreen] locationError:', locationError);
  }, [coordinates, hasPermission, locationError]);

  // Map store
  const {
    currentPosition,
    currentRoute,
    heatmapEnabled,
    heatmapData,
    heatmapFilters,
    isLoadingHeatmap,
    toggleHeatmap,
    loadHeatmapData,
    setHeatmapFilters,
    setDestination,
  } = useMapStore();

  // Auth store
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  // Network state - Requirement 14.5: Disable features when offline
  const {isConnected, status, isLoading: isNetworkLoading} = useNetworkContext();
  // Only consider offline if we're sure (not loading and explicitly offline)
  const isOffline = !isNetworkLoading && (status === 'offline' || !isConnected);

  // Local state
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const [compassMode, setCompassMode] = useState(false);
  const [userHeading, setUserHeading] = useState(0);
  const [lastBounds, setLastBounds] = useState<MapBounds | null>(null);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [nearbyOccurrences, setNearbyOccurrences] = useState<Array<{
    id: string;
    location: Coordinates;
    crimeType: string;
    severity: string;
  }>>([]);
  const [isLoadingOccurrences, setIsLoadingOccurrences] = useState(false);

  // Debounce timer for heatmap loading
  const heatmapDebounceRef = useRef<NodeJS.Timeout | null>(null);
  // Debounce timer for occurrences loading
  const occurrencesDebounceRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Update user heading from position
   */
  useEffect(() => {
    if (position?.heading !== undefined && position?.heading !== null) {
      setUserHeading(position.heading);
    }
  }, [position]);

  /**
   * Load occurrences for a given bounds
   */
  const loadOccurrencesForBounds = useCallback(async (bounds: MapBounds) => {
    if (isOffline || isLoadingOccurrences) return;
    
    setIsLoadingOccurrences(true);
    try {
      console.log('[MapScreen] Loading occurrences for bounds:', bounds);
      const occurrences = await occurrencesService.getNearby({
        bounds,
        days: 90,
      });
      
      console.log('[MapScreen] Loaded occurrences for region:', occurrences.length);
      
      const mappedOccurrences = occurrences.map(occ => ({
        id: occ.id,
        location: occ.location,
        crimeType: occ.crimeType?.name || 'Ocorrência',
        severity: occ.severity || 'medium',
      }));
      
      setNearbyOccurrences(mappedOccurrences);
    } catch (error) {
      console.warn('[MapScreen] Failed to load occurrences for region:', error);
    } finally {
      setIsLoadingOccurrences(false);
    }
  }, [isOffline, isLoadingOccurrences]);

  /**
   * Reload occurrences when screen gains focus (e.g., after creating a new occurrence)
   */
  useFocusEffect(
    useCallback(() => {
      // Reload occurrences when returning to this screen
      if (lastBounds && !isOffline) {
        loadOccurrencesForBounds(lastBounds);
      }
    }, [lastBounds, isOffline]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  /**
   * Handle address selection from search
   * Requirement 4.3: Center map on selected address
   * Requirement 14.5: Disable when offline
   */
  const handleSelectAddress = useCallback(
    (address: Address) => {
      // Check if offline - route calculation requires network
      if (isOffline) {
        Alert.alert(t('errors.offline'), t('errors.offlineMessage'));
        return;
      }

      // Center map on selected address
      mapRef.current?.animateToCoordinate(address.coordinates, 500);
      setIsFollowingUser(false);

      // Set as destination and navigate to route preview
      setDestination(address.coordinates);

      if (currentPosition) {
        navigation.navigate('RoutePreview', {
          origin: currentPosition,
          destination: address.coordinates,
          destinationAddress: address.formattedAddress,
        });
      }
    },
    [currentPosition, navigation, setDestination, isOffline, t],
  );

  /**
   * Handle center on user location button
   * Requirement 3.6: Button to center map on current location
   */
  const handleCenterOnUser = useCallback(async () => {
    if (!hasPermission) {
      const status = await requestPermission();
      if (status !== 'granted' && status !== 'limited') {
        Alert.alert(
          t('location.permissionRequired'),
          t('location.permissionMessage'),
        );
        return;
      }
    }

    const position = await getCurrentPosition();
    if (position) {
      mapRef.current?.animateToCoordinate(
        {latitude: position.latitude, longitude: position.longitude},
        500,
      );
      setIsFollowingUser(true);
    }
  }, [hasPermission, requestPermission, getCurrentPosition, t]);

  /**
   * Handle heatmap toggle
   * Requirement 9.1: Toggle heatmap overlay on map
   * Requirement 14.5: Disable when offline
   */
  const handleToggleHeatmap = useCallback(() => {
    // Check if offline - heatmap requires network
    if (isOffline && !heatmapEnabled) {
      Alert.alert(t('errors.offline'), t('errors.offlineMessage'));
      return;
    }

    toggleHeatmap();

    // Load heatmap data if enabling and we have bounds
    if (!heatmapEnabled && lastBounds && !isOffline) {
      loadHeatmapData(lastBounds, heatmapFilters || undefined);
    }
  }, [
    heatmapEnabled,
    lastBounds,
    heatmapFilters,
    toggleHeatmap,
    loadHeatmapData,
    isOffline,
    t,
  ]);

  /**
   * Handle opening heatmap filters modal
   * Requirement 9.4, 9.5: Filter heatmap by crime type and period
   */
  const handleOpenFilters = useCallback(() => {
    setShowFiltersModal(true);
  }, []);

  /**
   * Handle closing heatmap filters modal
   */
  const handleCloseFilters = useCallback(() => {
    setShowFiltersModal(false);
  }, []);

  /**
   * Handle filter changes
   * Requirement 9.4, 9.5: Apply filters to heatmap data
   */
  const handleFiltersChange = useCallback(
    (filters: HeatmapFilters | null) => {
      setHeatmapFilters(filters);

      // Reload heatmap data with new filters if enabled and we have bounds
      if (heatmapEnabled && lastBounds) {
        loadHeatmapData(lastBounds, filters || undefined);
      }
    },
    [heatmapEnabled, lastBounds, setHeatmapFilters, loadHeatmapData],
  );

  /**
   * Handle report occurrence button
   * Requirement 10.1: Button to register new occurrence
   * Requirement 14.5: Disable when offline
   */
  const handleReportOccurrence = useCallback(() => {
    // Check if offline - reporting requires network
    if (isOffline) {
      Alert.alert(t('errors.offline'), t('errors.offlineMessage'));
      return;
    }

    if (!isAuthenticated) {
      Alert.alert(t('auth.loginRequired'), t('auth.loginRequiredMessage'), [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('auth.login'),
          onPress: () => {
            // Navigate to login - this would need to be handled by root navigator
          },
        },
      ]);
      return;
    }

    // Use current position
    navigation.navigate('ReportOccurrence', {
      location: currentPosition || undefined,
    });
  }, [isAuthenticated, currentPosition, navigation, t, isOffline]);

  /**
   * Handle long press on map to report occurrence at that location
   */
  const handleMapLongPress = useCallback((coords: {latitude: number; longitude: number}) => {
    // Check if offline - reporting requires network
    if (isOffline) {
      Alert.alert(t('errors.offline'), t('errors.offlineMessage'));
      mapRef.current?.clearSelectedLocation();
      return;
    }

    if (!isAuthenticated) {
      Alert.alert(t('auth.loginRequired'), t('auth.loginRequiredMessage'), [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('auth.login'),
          onPress: () => {
            mapRef.current?.clearSelectedLocation();
          },
        },
      ]);
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      t('occurrence.reportAtLocation') || 'Reportar Ocorrência',
      t('occurrence.confirmLocation') || `Deseja reportar uma ocorrência neste local?\n\n📍 ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`,
      [
        {
          text: t('common.cancel') || 'Cancelar',
          style: 'cancel',
          onPress: () => {
            mapRef.current?.clearSelectedLocation();
          },
        },
        {
          text: t('common.confirm') || 'Confirmar',
          onPress: () => {
            mapRef.current?.clearSelectedLocation();
            navigation.navigate('ReportOccurrence', {
              location: coords,
            });
          },
        },
      ],
    );
  }, [isAuthenticated, navigation, t, isOffline]);

  /**
   * Handle map region change
   * Requirement 9.6: Request updated heatmap data when zoom changes
   * Requirement 15.4: Debounce and cancel pending requests
   * Requirement 14.5: Skip network requests when offline
   */
  const handleRegionChangeComplete = useCallback(
    (region: Region, bounds: MapBounds) => {
      setLastBounds(bounds);
      setIsFollowingUser(false);

      // Skip network requests when offline
      if (isOffline) return;

      // Debounce occurrences loading
      if (occurrencesDebounceRef.current) {
        clearTimeout(occurrencesDebounceRef.current);
      }
      occurrencesDebounceRef.current = setTimeout(() => {
        loadOccurrencesForBounds(bounds);
      }, DEBOUNCE_DELAY);

      // Debounce heatmap loading with cancellation
      if (heatmapEnabled) {
        if (heatmapDebounceRef.current) {
          clearTimeout(heatmapDebounceRef.current);
        }
        heatmapService.cancelPendingRequest();
        heatmapDebounceRef.current = setTimeout(() => {
          loadHeatmapData(bounds, heatmapFilters || undefined);
        }, DEBOUNCE_DELAY);
      }
    },
    [heatmapEnabled, heatmapFilters, loadHeatmapData, loadOccurrencesForBounds, isOffline],
  );

  /**
   * Handle map ready
   */
  const handleMapReady = useCallback(() => {
    // Initial heatmap load if enabled
    if (heatmapEnabled && lastBounds) {
      loadHeatmapData(lastBounds, heatmapFilters || undefined);
    }
  }, [heatmapEnabled, lastBounds, heatmapFilters, loadHeatmapData]);

  /**
   * Cleanup debounce timer and pending requests on unmount
   */
  useEffect(() => {
    return () => {
      if (heatmapDebounceRef.current) {
        clearTimeout(heatmapDebounceRef.current);
      }
      if (occurrencesDebounceRef.current) {
        clearTimeout(occurrencesDebounceRef.current);
      }
      // Cancel any pending heatmap request
      heatmapService.cancelPendingRequest();
    };
  }, []);

  /**
   * Show location error if any
   */
  useEffect(() => {
    if (locationError && locationError.type !== 'permission_denied') {
      Alert.alert(t('location.error'), t('location.errorMessage'));
    }
  }, [locationError, t]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background.primary}
      />

      {/* Map View */}
      <MapView
        ref={mapRef}
        userPosition={coordinates}
        showUserMarker={true}
        followUser={isFollowingUser}
        compassMode={compassMode}
        userHeading={userHeading}
        occurrences={nearbyOccurrences}
        onLongPress={handleMapLongPress}
        onRegionChangeComplete={handleRegionChangeComplete}
        onMapReady={handleMapReady}
        onCompassModeChange={setCompassMode}
        style={styles.map}>
        {/* Heatmap Layer */}
        {heatmapEnabled && (
          <HeatmapLayer points={heatmapData} visible={heatmapEnabled} />
        )}

        {/* Current Route */}
        {currentRoute && (
          <RoutePolyline route={currentRoute} showRiskColors={true} />
        )}
      </MapView>

      {/* Search Bar - disabled when offline */}
      <View style={styles.searchContainer}>
        <SearchBar
          onSelectAddress={handleSelectAddress}
          placeholder={t('search.placeholder')}
          disabled={isOffline}
        />
      </View>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        {/* Center on User Location */}
        <FAB
          icon="📍"
          onPress={handleCenterOnUser}
          active={isFollowingUser}
          disabled={isLocationLoading}
          accessibilityLabel={t('map.centerOnLocation')}
        />

        {/* Toggle Heatmap - disabled when offline */}
        <FAB
          icon="🔥"
          onPress={handleToggleHeatmap}
          active={heatmapEnabled}
          disabled={isLoadingHeatmap || (isOffline && !heatmapEnabled)}
          accessibilityLabel={t('map.toggleHeatmap')}
        />

        {/* Heatmap Filters - only show when heatmap is enabled */}
        {heatmapEnabled && (
          <FAB
            icon="⚙️"
            onPress={handleOpenFilters}
            active={heatmapFilters !== null}
            disabled={isOffline}
            accessibilityLabel={t('heatmap.filters')}
          />
        )}

        {/* Report Occurrence - disabled when offline */}
        <FAB
          icon="⚠️"
          onPress={handleReportOccurrence}
          disabled={isOffline}
          accessibilityLabel={t('map.reportOccurrence')}
        />
      </View>

      {/* Location Permission Banner */}
      {!hasPermission && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            {t('location.permissionDenied')}
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>
              {t('location.grantPermission')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Heatmap Loading Indicator */}
      {isLoadingHeatmap && heatmapEnabled && (
        <View style={styles.loadingBanner}>
          <Text style={styles.loadingText}>{t('map.loadingHeatmap')}</Text>
        </View>
      )}

      {/* Heatmap Filters Modal */}
      <HeatmapFiltersModal
        visible={showFiltersModal}
        onClose={handleCloseFilters}
        filters={heatmapFilters}
        onFiltersChange={handleFiltersChange}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: spacing.xl + 44, // Account for safe area
    left: spacing.base,
    right: spacing.base,
    zIndex: 1000,
  },
  fabContainer: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing['2xl'],
    gap: spacing.sm,
  },
  fab: {
    width: componentSpacing.mapControlSize,
    height: componentSpacing.mapControlSize,
    borderRadius: componentSpacing.mapControlBorderRadius,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  fabActive: {
    backgroundColor: colors.primary.main,
  },
  fabDisabled: {
    opacity: 0.5,
  },
  fabIcon: {
    fontSize: 20,
  },
  fabIconActive: {
    // Icon color adjustment for active state if needed
  },
  permissionBanner: {
    position: 'absolute',
    bottom:
      spacing['3xl'] + componentSpacing.mapControlSize * 3 + spacing.sm * 2,
    left: spacing.base,
    right: spacing.base,
    backgroundColor: colors.warning.main,
    borderRadius: componentSpacing.alertBannerBorderRadius,
    padding: componentSpacing.alertBannerPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.md,
  },
  permissionText: {
    ...textStyles.bodySmall,
    color: colors.neutral.white,
    flex: 1,
    marginRight: spacing.sm,
  },
  permissionButton: {
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
  },
  permissionButtonText: {
    ...textStyles.buttonSmall,
    color: colors.warning.dark,
  },
  loadingBanner: {
    position: 'absolute',
    top: spacing.xl + 44 + 56, // Below search bar
    left: spacing.base,
    right: spacing.base,
    backgroundColor: colors.info.main,
    borderRadius: componentSpacing.alertBannerBorderRadius,
    padding: spacing.sm,
    alignItems: 'center',
    ...shadows.sm,
  },
  loadingText: {
    ...textStyles.caption,
    color: colors.neutral.white,
  },
});

export default MapScreen;
