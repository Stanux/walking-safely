/**
 * RoutePreviewScreen
 * Shows route preview with distance, time, risk level and route type selection
 * Requirements: 7.1, 7.2, 7.3, 8.1-8.5, 9.1-9.6, 10.1-10.4
 */

import React, {useEffect, useState, useCallback, useRef} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import {useTheme} from '@/shared/theme/ThemeProvider';
import {tokens} from '@/shared/theme/tokens';
import {MapView, MapViewRef} from '@/components/map/MapView';
import {decodePolyline} from '@/components/map';
import {useMapStore} from '@/store/mapStore';
import {useOccurrenceStore} from '@/store/occurrenceStore';
import type {RoutePreviewScreenProps} from '@/types/navigation';
import type {RouteInstruction} from '@/types/models';

/**
 * Route type options
 */
type RouteType = 'safest' | 'fastest';

/**
 * Format distance in km or m
 */
const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

/**
 * Format duration in hours and minutes
 */
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
};

/**
 * Get risk level label and color
 */
const getRiskInfo = (riskIndex: number): {label: string; color: string} => {
  if (riskIndex <= 0.25) {
    return {label: 'Baixo', color: tokens.colors.success};
  }
  if (riskIndex <= 0.5) {
    return {label: 'Médio', color: tokens.colors.warning};
  }
  if (riskIndex <= 0.75) {
    return {label: 'Alto', color: '#FF6B00'};
  }
  return {label: 'Crítico', color: tokens.colors.error};
};


/**
 * RoutePreviewScreen Component
 */
export const RoutePreviewScreen: React.FC<RoutePreviewScreenProps> = ({
  navigation,
  route: navRoute,
}) => {
  const {theme} = useTheme();
  const isDark = theme === 'dark';
  const mapRef = useRef<MapViewRef>(null);

  const {origin, destination, destinationAddress} = navRoute.params;

  // Map store
  const {
    currentRoute,
    alternativeRoute,
    isCalculatingRoute,
    preferSafeRoute,
    calculateRoute,
    setPreferSafeRoute,
    selectAlternativeRoute,
    clearRoute,
    setCurrentPosition,
    setDestination,
  } = useMapStore();

  // Occurrence store
  const {occurrences, fetchOccurrences} = useOccurrenceStore();

  // Local state
  const [selectedRouteType, setSelectedRouteType] = useState<RouteType>(
    preferSafeRoute ? 'safest' : 'fastest'
  );
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Initialize route calculation
   */
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      setCurrentPosition(origin);
      setDestination(destination);
      
      // Calculate route with default preference (safest - Req 7.2)
      calculateRoute(true).catch(error => {
        console.error('[RoutePreview] Route calculation error:', error);
        
        // Provide more specific error message based on error type
        let errorMessage = 'Não foi possível calcular a rota. Tente novamente.';
        
        if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
          errorMessage = 'O cálculo da rota demorou muito. Para rotas muito longas, tente dividir em trechos menores.';
        } else if (error?.status === 503 || error?.code === 'SERVICE_UNAVAILABLE') {
          errorMessage = 'Serviço de rotas temporariamente indisponível. Tente novamente em alguns instantes.';
        }
        
        Alert.alert(
          'Erro',
          errorMessage,
          [{text: 'OK', onPress: () => navigation.goBack()}]
        );
      });
    }
  }, [isInitialized, origin, destination, setCurrentPosition, setDestination, calculateRoute, navigation]);

  /**
   * Debug: Log instructions when route changes
   */
  useEffect(() => {
    if (currentRoute) {
      console.log('[RoutePreview] Current route instructions count:', currentRoute.instructions?.length || 0);
      if (currentRoute.instructions && currentRoute.instructions.length > 0) {
        console.log('[RoutePreview] First instruction:', currentRoute.instructions[0]);
      }
    }
  }, [currentRoute]);

  /**
   * Load occurrences for route area
   */
  useEffect(() => {
    if (currentRoute) {
      const bounds = {
        northEast: {
          latitude: Math.max(origin.latitude, destination.latitude) + 0.01,
          longitude: Math.max(origin.longitude, destination.longitude) + 0.01,
        },
        southWest: {
          latitude: Math.min(origin.latitude, destination.latitude) - 0.01,
          longitude: Math.min(origin.longitude, destination.longitude) - 0.01,
        },
      };
      fetchOccurrences(bounds);
    }
  }, [currentRoute, origin, destination, fetchOccurrences]);

  /**
   * Handle route type change
   * Requirement 7.1: Allow choice between fastest and safest route
   */
  const handleRouteTypeChange = useCallback(async (type: RouteType) => {
    if (selectedRouteType === type) return; // Already selected
    
    setSelectedRouteType(type);
    const preferSafe = type === 'safest';
    setPreferSafeRoute(preferSafe);
    
    // Swap current and alternative routes
    if (alternativeRoute) {
      selectAlternativeRoute();
    }
  }, [selectedRouteType, setPreferSafeRoute, alternativeRoute, selectAlternativeRoute]);

  /**
   * Handle start navigation
   * Requirement 11.1: Start navigation mode
   */
  const handleStartNavigation = useCallback(() => {
    if (!currentRoute) return;

    navigation.replace('ActiveNavigation', {
      route: currentRoute,
      sessionId: currentRoute.id,
    });
  }, [currentRoute, navigation]);

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    clearRoute();
    navigation.goBack();
  }, [clearRoute, navigation]);

  const riskInfo = currentRoute ? getRiskInfo(currentRoute.averageRiskIndex) : null;

  return (
    <SafeAreaView
      style={[
        styles.container,
        {backgroundColor: isDark ? tokens.colors.background.dark : tokens.colors.background.light},
      ]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? tokens.colors.background.dark : tokens.colors.background.light}
      />

      {/* Map with route */}
      <MapView
        ref={mapRef}
        userPosition={origin}
        showUserMarker={true}
        followUser={false}
        routeCoordinates={currentRoute?.polyline ? decodePolyline(currentRoute.polyline) : undefined}
        destination={destination}
        occurrences={occurrences.map(occ => ({
          id: occ.id,
          location: occ.location,
          crimeType: occ.crimeType?.name || 'Ocorrência',
          severity: occ.severity || 'medium',
        }))}
        style={styles.map}
      />

      {/* Back button */}
      <TouchableOpacity
        style={[
          styles.backButton,
          {backgroundColor: isDark ? tokens.colors.surface.dark : tokens.colors.background.light},
        ]}
        onPress={handleBack}
        accessibilityLabel="Voltar">
        <View style={styles.backIconContainer}>
          <View style={[styles.backArrow, {borderColor: isDark ? '#fff' : '#333'}]} />
        </View>
      </TouchableOpacity>

      {/* Bottom panel */}
      <View
        style={[
          styles.bottomPanel,
          {backgroundColor: isDark ? tokens.colors.surface.dark : tokens.colors.background.light},
        ]}>
        {isCalculatingRoute ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tokens.colors.primary[500]} />
            <Text
              style={[
                styles.loadingText,
                {color: isDark ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light},
              ]}>
              Calculando rota...
            </Text>
          </View>
        ) : currentRoute ? (
          <>
            {/* Destination address */}
            {destinationAddress && (
              <Text
                style={[
                  styles.destinationText,
                  {color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light},
                ]}
                numberOfLines={2}>
                📍 {destinationAddress}
              </Text>
            )}

            {/* Route type selector - Requirement 7.1 */}
            <View style={styles.routeTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.routeTypeButton,
                  selectedRouteType === 'safest' && styles.routeTypeButtonActive,
                ]}
                onPress={() => handleRouteTypeChange('safest')}>
                <Text style={styles.routeTypeIcon}>🛡️</Text>
                <View style={styles.routeTypeInfo}>
                  <Text
                    style={[
                      styles.routeTypeText,
                      selectedRouteType === 'safest' && styles.routeTypeTextActive,
                    ]}>
                    Mais Segura
                  </Text>
                  {/* Show safe route info - safe route is currentRoute when safest is selected */}
                  {(() => {
                    const safeRoute = selectedRouteType === 'safest' ? currentRoute : alternativeRoute;
                    return safeRoute && (
                      <Text style={styles.routeTypeSubtext}>
                        {formatDistance(safeRoute.distance)} • {formatDuration(safeRoute.duration)}
                      </Text>
                    );
                  })()}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.routeTypeButton,
                  selectedRouteType === 'fastest' && styles.routeTypeButtonActive,
                ]}
                onPress={() => handleRouteTypeChange('fastest')}>
                <Text style={styles.routeTypeIcon}>⚡</Text>
                <View style={styles.routeTypeInfo}>
                  <Text
                    style={[
                      styles.routeTypeText,
                      selectedRouteType === 'fastest' && styles.routeTypeTextActive,
                    ]}>
                    Mais Rápida
                  </Text>
                  {/* Show fast route info - fast route is alternativeRoute when safest is selected */}
                  {(() => {
                    const fastRoute = selectedRouteType === 'safest' ? alternativeRoute : currentRoute;
                    return fastRoute && (
                      <Text style={styles.routeTypeSubtext}>
                        {formatDistance(fastRoute.distance)} • {formatDuration(fastRoute.duration)}
                      </Text>
                    );
                  })()}
                </View>
              </TouchableOpacity>
            </View>

            {/* Route info - Requirement 9.1, 9.2, 9.3, 9.4 */}
            <View style={styles.routeInfoContainer}>
              <View style={styles.routeInfoItem}>
                <Text style={styles.routeInfoIcon}>📏</Text>
                <Text
                  style={[
                    styles.routeInfoValue,
                    {color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light},
                  ]}>
                  {formatDistance(currentRoute.distance)}
                </Text>
                <Text
                  style={[
                    styles.routeInfoLabel,
                    {color: isDark ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light},
                  ]}>
                  Distância
                </Text>
              </View>

              <View style={styles.routeInfoItem}>
                <Text style={styles.routeInfoIcon}>⏱️</Text>
                <Text
                  style={[
                    styles.routeInfoValue,
                    {color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light},
                  ]}>
                  {formatDuration(currentRoute.duration)}
                </Text>
                <Text
                  style={[
                    styles.routeInfoLabel,
                    {color: isDark ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light},
                  ]}>
                  Tempo
                </Text>
              </View>

              <View style={styles.routeInfoItem}>
                <Text style={styles.routeInfoIcon}>⚠️</Text>
                <Text style={[styles.routeInfoValue, {color: riskInfo?.color}]}>
                  {riskInfo?.label}
                </Text>
                <Text
                  style={[
                    styles.routeInfoLabel,
                    {color: isDark ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light},
                  ]}>
                  Risco
                </Text>
              </View>
            </View>

            {/* Warning message */}
            {currentRoute.requiresWarning && currentRoute.warningMessage && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  ⚠️ {currentRoute.warningMessage}
                </Text>
              </View>
            )}

            {/* Action buttons - Requirement 9.5, 9.6 */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.instructionsButton}
                onPress={() => setShowInstructions(true)}>
                <Text style={styles.buttonIcon}>📋</Text>
                <Text style={styles.instructionsButtonText}>Instruções</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartNavigation}>
                <Text style={styles.buttonIcon}>▶️</Text>
                <Text style={styles.startButtonText}>Iniciar</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>

      {/* Instructions Modal - Requirement 10.1, 10.2, 10.3, 10.4 */}
      <Modal
        visible={showInstructions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInstructions(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {backgroundColor: isDark ? tokens.colors.surface.dark : tokens.colors.background.light},
            ]}>
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  {color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light},
                ]}>
                Instruções do Trajeto ({currentRoute?.instructions?.length || 0})
              </Text>
              <TouchableOpacity onPress={() => setShowInstructions(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.instructionsList}>
              {(!currentRoute?.instructions || currentRoute.instructions.length === 0) ? (
                <Text
                  style={[
                    styles.instructionText,
                    {color: isDark ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light},
                  ]}>
                  Nenhuma instrução disponível
                </Text>
              ) : (
                currentRoute.instructions.map((instruction: RouteInstruction, index: number) => (
                  <View key={index} style={styles.instructionItem}>
                    <View style={styles.instructionNumber}>
                      <Text style={styles.instructionNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.instructionContent}>
                      <Text
                        style={[
                          styles.instructionText,
                          {color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light},
                        ]}>
                        {instruction.text}
                      </Text>
                      {instruction.distance > 0 && (
                        <Text
                          style={[
                            styles.instructionDistance,
                            {color: isDark ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light},
                          ]}>
                          {formatDistance(instruction.distance)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: tokens.spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.md,
  },
  backIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    transform: [{rotate: '45deg'}],
    marginLeft: 4,
  },
  bottomPanel: {
    borderTopLeftRadius: tokens.borderRadius.xl,
    borderTopRightRadius: tokens.borderRadius.xl,
    padding: tokens.spacing.lg,
    ...tokens.shadow.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.xl,
  },
  loadingText: {
    marginTop: tokens.spacing.md,
    fontSize: tokens.typography.fontSize.md,
  },
  destinationText: {
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '600',
    marginBottom: tokens.spacing.md,
  },
  routeTypeContainer: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
  routeTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    gap: tokens.spacing.xs,
  },
  routeTypeButtonActive: {
    borderColor: tokens.colors.primary[500],
    backgroundColor: tokens.colors.primary[50],
  },
  routeTypeIcon: {
    fontSize: 18,
  },
  routeTypeInfo: {
    flex: 1,
  },
  routeTypeText: {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: '500',
    color: tokens.colors.text.secondary.light,
  },
  routeTypeTextActive: {
    color: tokens.colors.primary[500],
    fontWeight: '600',
  },
  routeTypeSubtext: {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.text.secondary.light,
    marginTop: 2,
  },
  routeInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: tokens.spacing.lg,
  },
  routeInfoItem: {
    alignItems: 'center',
  },
  routeInfoIcon: {
    fontSize: 24,
    marginBottom: tokens.spacing.xs,
  },
  routeInfoValue: {
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: '700',
  },
  routeInfoLabel: {
    fontSize: tokens.typography.fontSize.xs,
    marginTop: 2,
  },
  warningContainer: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  warningText: {
    color: '#FF6B00',
    fontSize: tokens.typography.fontSize.sm,
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
  },
  instructionsButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    borderWidth: 2,
    borderColor: tokens.colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
  },
  instructionsButtonText: {
    color: tokens.colors.primary[500],
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '600',
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    backgroundColor: tokens.colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '600',
  },
  buttonIcon: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    minHeight: 300,
    borderTopLeftRadius: tokens.borderRadius.xl,
    borderTopRightRadius: tokens.borderRadius.xl,
    padding: tokens.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  modalTitle: {
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: '700',
  },
  modalCloseIcon: {
    fontSize: 24,
    color: tokens.colors.text.secondary.light,
  },
  instructionsList: {
    flex: 1,
    minHeight: 200,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: tokens.spacing.md,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tokens.colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.md,
  },
  instructionNumberText: {
    color: '#FFFFFF',
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: '600',
  },
  instructionContent: {
    flex: 1,
  },
  instructionText: {
    fontSize: tokens.typography.fontSize.md,
  },
  instructionDistance: {
    fontSize: tokens.typography.fontSize.sm,
    marginTop: 2,
  },
});

export default RoutePreviewScreen;
