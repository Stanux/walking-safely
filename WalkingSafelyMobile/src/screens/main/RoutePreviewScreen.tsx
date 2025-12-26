/**
 * Route Preview Screen
 * Displays calculated route with risk information
 */

import React, {useRef, useCallback, useEffect, useState, useMemo} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors, getRiskColor} from '../../theme/colors';
import {spacing, componentSpacing, shadows, borderRadius} from '../../theme/spacing';
import {textStyles} from '../../theme/typography';
import {MapView, MapViewRef} from '../../components/map/MapView';
import {Button} from '../../components/common/Button';
import {useMapStore} from '../../store/mapStore';
import {decodePolyline} from '../../components/map/RoutePolyline';
import {RISK_WARNING_THRESHOLD, RISK_HIGH_THRESHOLD} from '../../utils/constants';
import type {RoutePreviewScreenProps} from '../../types/navigation';

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes} min`;
};

const formatDistance = (meters: number): string => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
};

const getRiskLabel = (riskIndex: number, t: (key: string) => string): string => {
  if (riskIndex < 30) return t('route.riskLow');
  if (riskIndex < 70) return t('route.riskMedium');
  return t('route.riskHigh');
};

interface RouteInfoCardProps {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
  highlightColor?: string;
}

const RouteInfoCard: React.FC<RouteInfoCardProps> = ({
  label, value, icon, highlight = false, highlightColor,
}) => (
  <View style={[styles.infoCard, highlight && styles.infoCardHighlight]}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlightColor ? {color: highlightColor} : undefined]}>
        {value}
      </Text>
    </View>
  </View>
);

export const RoutePreviewScreen: React.FC<RoutePreviewScreenProps> = ({
  navigation,
  route: navRoute,
}) => {
  const {t} = useTranslation();
  const mapRef = useRef<MapViewRef>(null);

  const {origin, destination, destinationAddress} = navRoute.params;

  const {
    currentRoute,
    isCalculatingRoute,
    preferSafeRoute,
    error,
    calculateRoute,
    setPreferSafeRoute,
    startNavigation,
    clearError,
    setCurrentPosition,
    setDestination,
  } = useMapStore();

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Decode route polyline to coordinates
  const routeCoordinates = useMemo(() => {
    console.log('[RoutePreview] currentRoute:', currentRoute);
    console.log('[RoutePreview] polyline:', currentRoute?.polyline);
    
    if (!currentRoute?.polyline) {
      console.log('[RoutePreview] No polyline available');
      return [];
    }
    
    const decoded = decodePolyline(currentRoute.polyline);
    console.log('[RoutePreview] Decoded coordinates count:', decoded.length);
    return decoded;
  }, [currentRoute?.polyline]);

  // Set origin and destination in store on mount
  useEffect(() => {
    console.log('[RoutePreview] Setting origin:', origin);
    console.log('[RoutePreview] Setting destination:', destination);
    setCurrentPosition(origin);
    setDestination(destination);
  }, [origin, destination, setCurrentPosition, setDestination]);

  // Calculate route on mount
  useEffect(() => {
    const loadRoute = async () => {
      try {
        console.log('[RoutePreview] Calculating route...');
        await calculateRoute(preferSafeRoute);
        console.log('[RoutePreview] Route calculated successfully');
        setIsInitialLoad(false);
      } catch (err) {
        console.error('[RoutePreview] Route calculation error:', err);
        setIsInitialLoad(false);
      }
    };
    loadRoute();
  }, []);

  // Fit map to show route
  useEffect(() => {
    if (currentRoute && mapRef.current && routeCoordinates.length > 0) {
      console.log('[RoutePreview] Fitting map to route bounds');
      setTimeout(() => {
        mapRef.current?.fitToCoordinates([origin, destination]);
      }, 500);
    }
  }, [currentRoute, origin, destination, routeCoordinates.length]);

  const handleRouteToggle = useCallback(async (preferSafe: boolean) => {
    if (preferSafe === preferSafeRoute) return;
    setPreferSafeRoute(preferSafe);
    await calculateRoute(preferSafe);
  }, [preferSafeRoute, setPreferSafeRoute, calculateRoute]);

  const handleStartNavigation = useCallback(() => {
    if (!currentRoute) return;
    startNavigation();
    navigation.replace('ActiveNavigation', {
      route: currentRoute,
      sessionId: currentRoute.id,
    });
  }, [currentRoute, startNavigation, navigation]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const showRiskWarning = currentRoute && currentRoute.maxRiskIndex >= RISK_WARNING_THRESHOLD;
  const riskColor = currentRoute ? getRiskColor(currentRoute.maxRiskIndex) : colors.risk.low;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          userPosition={origin}
          showUserMarker={true}
          destination={destination}
          routeCoordinates={routeCoordinates}
          occurrences={currentRoute?.occurrences}
          style={styles.map}
        />

        <TouchableOpacity style={styles.backButton} onPress={handleGoBack} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSheet}>
        {isCalculatingRoute && isInitialLoad && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={styles.loadingText}>{t('navigation.calculating')}</Text>
          </View>
        )}

        {error && !currentRoute && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{t('errors.routeCalculation')}</Text>
            <Button
              title={t('common.retry')}
              onPress={() => {
                clearError();
                calculateRoute(preferSafeRoute);
              }}
              variant="outline"
              size="small"
            />
          </View>
        )}

        {currentRoute && (
          <ScrollView style={styles.routeInfoContainer} showsVerticalScrollIndicator={false}>
            {destinationAddress && (
              <View style={styles.destinationContainer}>
                <Text style={styles.destinationIcon}>📍</Text>
                <Text style={styles.destinationText} numberOfLines={2}>
                  {destinationAddress}
                </Text>
              </View>
            )}

            {showRiskWarning && (
              <View style={[
                styles.warningBanner,
                currentRoute.maxRiskIndex >= RISK_HIGH_THRESHOLD 
                  ? styles.warningBannerHigh 
                  : styles.warningBannerMedium
              ]}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>
                    {currentRoute.maxRiskIndex >= RISK_HIGH_THRESHOLD
                      ? t('navigation.highRiskWarning')
                      : t('navigation.riskWarning')}
                  </Text>
                  {currentRoute.warningMessage && (
                    <Text style={styles.warningMessage}>{currentRoute.warningMessage}</Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.infoCardsContainer}>
              <RouteInfoCard
                label={t('navigation.duration')}
                value={formatDuration(currentRoute.duration)}
                icon="⏱️"
              />
              <RouteInfoCard
                label={t('navigation.distance')}
                value={formatDistance(currentRoute.distance)}
                icon="📏"
              />
              <RouteInfoCard
                label={t('navigation.riskIndex')}
                value={`${currentRoute.maxRiskIndex} - ${getRiskLabel(currentRoute.maxRiskIndex, t)}`}
                icon="🛡️"
                highlight={currentRoute.maxRiskIndex >= RISK_WARNING_THRESHOLD}
                highlightColor={riskColor}
              />
            </View>

            {isCalculatingRoute && !isInitialLoad && (
              <View style={styles.recalculatingContainer}>
                <ActivityIndicator size="small" color={colors.primary.main} />
                <Text style={styles.recalculatingText}>{t('navigation.recalculating')}</Text>
              </View>
            )}

            <Button
              title={t('navigation.startNavigation')}
              onPress={handleStartNavigation}
              variant="primary"
              size="large"
              fullWidth
              disabled={isCalculatingRoute}
              style={styles.startButton}
            />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  backButton: {
    position: 'absolute', top: spacing.base, left: spacing.base,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.background.primary,
    alignItems: 'center', justifyContent: 'center', ...shadows.md,
  },
  backButtonText: { fontSize: 24, color: colors.text.primary },
  bottomSheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: componentSpacing.bottomSheetBorderRadius,
    borderTopRightRadius: componentSpacing.bottomSheetBorderRadius,
    paddingHorizontal: componentSpacing.bottomSheetPadding,
    paddingTop: spacing.lg, paddingBottom: spacing['2xl'],
    minHeight: 250, ...shadows.lg,
  },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['2xl'] },
  loadingText: { ...textStyles.body, color: colors.text.secondary, marginTop: spacing.md },
  errorContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['2xl'], gap: spacing.md },
  errorText: { ...textStyles.body, color: colors.error.main, textAlign: 'center' },
  routeInfoContainer: { flex: 1 },
  destinationContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  destinationIcon: { fontSize: 20, marginRight: spacing.sm },
  destinationText: { ...textStyles.h5, color: colors.text.primary, flex: 1 },
  warningBanner: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
    borderRadius: borderRadius.lg, marginBottom: spacing.md,
  },
  warningBannerMedium: { backgroundColor: colors.warning.light },
  warningBannerHigh: { backgroundColor: colors.error.light },
  warningIcon: { fontSize: 24, marginRight: spacing.sm },
  warningContent: { flex: 1 },
  warningTitle: { ...textStyles.label, color: colors.text.primary },
  warningMessage: { ...textStyles.caption, color: colors.text.secondary, marginTop: spacing.xs },
  infoCardsContainer: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  infoCard: {
    flex: 1, backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center',
  },
  infoCardHighlight: { borderWidth: 1, borderColor: colors.warning.main },
  infoIcon: { fontSize: 20, marginBottom: spacing.xs },
  infoContent: { alignItems: 'center' },
  infoLabel: { ...textStyles.caption, color: colors.text.secondary, marginBottom: spacing.xs },
  infoValue: { ...textStyles.label, color: colors.text.primary, textAlign: 'center' },
  recalculatingContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md, gap: spacing.sm,
  },
  recalculatingText: { ...textStyles.caption, color: colors.text.secondary },
  startButton: { marginTop: spacing.sm },
});

export default RoutePreviewScreen;
