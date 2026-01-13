/**
 * MapScreen
 * Main map view with user location, risk points, search, and navigation features
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 4.1, 6.1, 6.2
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
  TextInput,
  FlatList,
  Keyboard,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {apiClient} from '@/shared/services/api/apiClient';
import Geolocation from '@react-native-community/geolocation';
import {useTheme} from '@/shared/theme/ThemeProvider';
import {tokens} from '@/shared/theme/tokens';
import {MapView, MapViewRef} from '@/components/map/MapView';
import {RiskPointPopup} from '@/components/map/RiskPointPopup';
import {useMapStore} from '@/store/mapStore';
import {useOccurrenceStore} from '@/store/occurrenceStore';
import {useAuthStore} from '@/features/auth/store/authStore';
import {Coordinates, MapBounds, Address} from '@/types/models';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

// Navigation types
type AppStackParamList = {
  Home: undefined;
  MapScreen: undefined;
  OccurrenceCreate: {coordinates: Coordinates};
  RoutePreview: {
    origin: Coordinates;
    destination: Coordinates;
    destinationAddress?: string;
  };
};

type MapScreenNavigationProp = NativeStackNavigationProp<AppStackParamList, 'MapScreen'>;

interface MapScreenProps {
  navigation: MapScreenNavigationProp;
}

// Default location (São Paulo)
const DEFAULT_POSITION: Coordinates = {
  latitude: -23.5505,
  longitude: -46.6333,
};

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
}) => {
  const {theme} = useTheme();
  const isDark = theme === 'dark';

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {backgroundColor: isDark ? tokens.colors.surface.dark : tokens.colors.background.light},
        active && {backgroundColor: tokens.colors.primary[500]},
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
};

/**
 * Search Result Item Component
 */
interface SearchResultItemProps {
  address: Address;
  onPress: (address: Address) => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({address, onPress}) => {
  const {theme} = useTheme();
  const isDark = theme === 'dark';

  return (
    <TouchableOpacity
      style={[
        styles.searchResultItem,
        {backgroundColor: isDark ? tokens.colors.surface.dark : tokens.colors.background.light},
      ]}
      onPress={() => onPress(address)}
      activeOpacity={0.7}>
      <Text style={styles.searchResultIcon}>📍</Text>
      <Text
        style={[
          styles.searchResultText,
          {color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light},
        ]}
        numberOfLines={2}>
        {address.formattedAddress}
      </Text>
    </TouchableOpacity>
  );
};

/**
 * MapScreen Component
 * Main map view with search, location tracking, and risk points
 */
export const MapScreen: React.FC<MapScreenProps> = ({navigation}) => {
  console.log('[MapScreen] Rendering MapScreen');
  const {theme} = useTheme();
  const isDark = theme === 'dark';
  const mapRef = useRef<MapViewRef>(null);

  // Auth store
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);

  // Map store
  const {
    currentPosition,
    setCurrentPosition,
    heatmapEnabled,
    toggleHeatmap,
    isLoadingHeatmap,
  } = useMapStore();

  // Occurrence store - Requirements 2.1, 2.2, 2.3
  const {
    occurrences,
    isLoading: isLoadingOccurrences,
    selectedOccurrence,
    fetchOccurrences,
    selectOccurrence,
    deleteOccurrence,
  } = useOccurrenceStore();

  // Local state
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [showOccurrencePopup, setShowOccurrencePopup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Address[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [lastBounds, setLastBounds] = useState<MapBounds | null>(null);

  // Debounce timer refs
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const occurrencesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Request location permission
   */
  useEffect(() => {
    const requestLocationPermission = async () => {
      setIsLocationLoading(true);
      
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Permissão de Localização',
              message: 'O app precisa acessar sua localização para mostrar sua posição no mapa.',
              buttonNeutral: 'Perguntar Depois',
              buttonNegative: 'Cancelar',
              buttonPositive: 'OK',
            },
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            setHasLocationPermission(true);
            getCurrentLocation();
            return;
          }
        } else {
          // iOS - permission handled by Info.plist
          setHasLocationPermission(true);
          getCurrentLocation();
          return;
        }
      } catch (err) {
        console.warn('Location permission error:', err);
      }
      
      // Use default position if permission denied
      setCurrentPosition(DEFAULT_POSITION);
      setIsLocationLoading(false);
    };

    const getCurrentLocation = () => {
      // Primeiro tenta com baixa precisão (mais rápido)
      Geolocation.getCurrentPosition(
        (position) => {
          const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          console.log('[MapScreen] Got user location:', coords);
          setCurrentPosition(coords);
          setIsLocationLoading(false);
        },
        (error) => {
          console.warn('[MapScreen] Geolocation error (low accuracy):', error);
          // Tenta com alta precisão como fallback
          Geolocation.getCurrentPosition(
            (position) => {
              const coords: Coordinates = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };
              console.log('[MapScreen] Got user location (high accuracy):', coords);
              setCurrentPosition(coords);
              setIsLocationLoading(false);
            },
            (err) => {
              console.warn('[MapScreen] Geolocation error (high accuracy):', err);
              setCurrentPosition(DEFAULT_POSITION);
              setIsLocationLoading(false);
            },
            {
              enableHighAccuracy: true,
              timeout: 30000,
              maximumAge: 60000,
            }
          );
        },
        {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 60000,
        }
      );
    };

    requestLocationPermission();
  }, [setCurrentPosition]);

  /**
   * Center map on user position when it's first obtained
   */
  useEffect(() => {
    if (currentPosition && mapRef.current && !isLocationLoading) {
      console.log('[MapScreen] Auto-centering on user position:', currentPosition);
      mapRef.current.animateToCoordinate(currentPosition);
    }
  }, [currentPosition, isLocationLoading]);

  /**
   * Load occurrences for visible map area
   * Requirements 2.1, 2.2, 2.3: Display risk points within visible map area
   */
  const loadOccurrencesForBounds = useCallback(async (bounds: MapBounds) => {
    if (isLoadingOccurrences) return;
    
    try {
      await fetchOccurrences(bounds);
    } catch (error) {
      console.warn('Failed to load occurrences:', error);
    }
  }, [isLoadingOccurrences, fetchOccurrences]);

  /**
   * Handle map region change
   * Requirement 2.3: Update risk points when map moves or zooms
   */
  const handleRegionChangeComplete = useCallback(
    (_region: unknown, bounds: MapBounds) => {
      setLastBounds(bounds);
      setIsFollowingUser(false);

      // Debounce occurrences loading
      if (occurrencesDebounceRef.current) {
        clearTimeout(occurrencesDebounceRef.current);
      }
      occurrencesDebounceRef.current = setTimeout(() => {
        loadOccurrencesForBounds(bounds);
      }, 500);
    },
    [loadOccurrencesForBounds]
  );

  /**
   * Handle center on user location button
   * Requirement 1.1: Center map on current location
   */
  const handleCenterOnUser = useCallback(() => {
    setIsFollowingUser(true);
    
    const position = currentPosition || DEFAULT_POSITION;
    if (mapRef.current) {
      mapRef.current.animateToCoordinate(position);
    }
  }, [currentPosition]);

  /**
   * Handle long press on map to report occurrence
   * Requirement 4.1: Open occurrence form on 1 second long press
   */
  const handleMapLongPress = useCallback((coords: Coordinates) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Necessário',
        'Faça login para reportar ocorrências.',
        [{text: 'OK'}]
      );
      return;
    }

    navigation.navigate('OccurrenceCreate', {coordinates: coords});
  }, [isAuthenticated, navigation]);

  /**
   * Handle occurrence marker press
   * Requirement 3.1: Display popup with occurrence details when tapped
   */
  const handleOccurrencePress = useCallback((occurrence: {
    id: string;
    location: Coordinates;
    crimeType: string;
    severity: string;
  }) => {
    const fullOccurrence = occurrences.find(occ => occ.id === occurrence.id);
    if (fullOccurrence) {
      selectOccurrence(fullOccurrence);
      setShowOccurrencePopup(true);
    }
  }, [occurrences, selectOccurrence]);

  /**
   * Handle closing occurrence popup
   * Requirement 3.5: Allow user to close and return to map
   */
  const handleCloseOccurrencePopup = useCallback(() => {
    setShowOccurrencePopup(false);
    selectOccurrence(null);
  }, [selectOccurrence]);

  /**
   * Handle deleting an occurrence
   */
  const handleDeleteOccurrence = useCallback(async (id: string) => {
    try {
      await deleteOccurrence(id);
      setShowOccurrencePopup(false);
    } catch (error) {
      console.error('[MapScreen] Error deleting occurrence:', error);
    }
  }, [deleteOccurrence]);

  /**
   * Handle search input change
   * Requirement 6.1: Search for addresses
   */
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (text.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Chamar API de geocoding
        const response = await apiClient.get('/geocode', {
          params: {
            query: text,
            limit: 5,
          },
        });
        
        // Mapear resposta da API (snake_case) para formato do app (camelCase)
        const apiResults = response.data?.data || [];
        const results: Address[] = apiResults.map((item: any, index: number) => ({
          id: String(index + 1),
          formattedAddress: item.formatted_address,
          coordinates: {
            latitude: item.coordinates?.latitude,
            longitude: item.coordinates?.longitude,
          },
          city: item.city,
          state: item.state,
          country: item.country,
        }));
        
        console.log('[MapScreen] Geocoding results:', results);
        setSearchResults(results);
        setShowSearchResults(results.length > 0);
      } catch (error) {
        console.warn('[MapScreen] Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  /**
   * Handle address selection from search results
   * Requirement 6.2: Set selected address as destination
   */
  const handleSelectAddress = useCallback((address: Address) => {
    Keyboard.dismiss();
    setSearchQuery(address.formattedAddress);
    setShowSearchResults(false);
    
    // Get current position for route origin
    const origin = currentPosition || DEFAULT_POSITION;
    
    // Navigate to RoutePreview screen - Requirement 7.1
    navigation.navigate('RoutePreview', {
      origin,
      destination: address.coordinates,
      destinationAddress: address.formattedAddress,
    });
  }, [currentPosition, navigation]);

  /**
   * Handle map ready
   */
  const handleMapReady = useCallback(() => {
    // Load initial occurrences if we have bounds
    if (lastBounds) {
      loadOccurrencesForBounds(lastBounds);
    }
  }, [lastBounds, loadOccurrencesForBounds]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      if (occurrencesDebounceRef.current) {
        clearTimeout(occurrencesDebounceRef.current);
      }
    };
  }, []);

  // Get user's first name for greeting
  const firstName = user?.name?.split(' ')[0] || '';

  // Debug: log occurrences being passed to map
  useEffect(() => {
    if (occurrences.length > 0) {
      console.log('[MapScreen] Occurrences to display:', occurrences.length, occurrences.map(o => ({
        id: o.id,
        lat: o.location?.latitude,
        lng: o.location?.longitude,
        type: o.crimeType?.name,
        severity: o.severity,
      })));
    }
  }, [occurrences]);

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

      {/* Map View */}
      <MapView
        ref={mapRef}
        userPosition={currentPosition || DEFAULT_POSITION}
        showUserMarker={true}
        followUser={isFollowingUser}
        occurrences={occurrences.map(occ => ({
          id: occ.id,
          location: occ.location,
          crimeType: occ.crimeType?.name || 'Ocorrência',
          severity: occ.severity || 'medium',
        }))}
        onLongPress={handleMapLongPress}
        onOccurrencePress={handleOccurrencePress}
        onRegionChangeComplete={handleRegionChangeComplete}
        onMapReady={handleMapReady}
        style={styles.map}
      />

      {/* Header with greeting and search */}
      <View style={styles.headerContainer}>
        {firstName && (
          <Text
            style={[
              styles.greeting,
              {color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light},
            ]}>
            Olá, {firstName}! 👋
          </Text>
        )}
        
        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {backgroundColor: isDark ? tokens.colors.surface.dark : tokens.colors.background.light},
          ]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[
              styles.searchInput,
              {color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light},
            ]}
            placeholder="Para onde você vai?"
            placeholderTextColor={isDark ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => searchQuery.length >= 3 && setShowSearchResults(true)}
          />
          {isSearching && <ActivityIndicator size="small" color={tokens.colors.primary[500]} />}
        </View>

        {/* Search Results */}
        {showSearchResults && searchResults.length > 0 && (
          <View
            style={[
              styles.searchResultsContainer,
              {backgroundColor: isDark ? tokens.colors.surface.dark : tokens.colors.background.light},
            ]}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({item}) => (
                <SearchResultItem address={item} onPress={handleSelectAddress} />
              )}
              keyboardShouldPersistTaps="handled"
              style={styles.searchResultsList}
            />
          </View>
        )}
      </View>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        {/* Center on User Location */}
        <FAB
          icon="📍"
          onPress={handleCenterOnUser}
          active={isFollowingUser}
          disabled={isLocationLoading}
          accessibilityLabel="Centralizar no meu local"
        />

        {/* Toggle Heatmap */}
        <FAB
          icon="🔥"
          onPress={toggleHeatmap}
          active={heatmapEnabled}
          disabled={isLoadingHeatmap}
          accessibilityLabel="Alternar mapa de calor"
        />

        {/* Report Occurrence */}
        <FAB
          icon="⚠️"
          onPress={() => {
            const position = currentPosition || DEFAULT_POSITION;
            handleMapLongPress(position);
          }}
          accessibilityLabel="Reportar ocorrência"
        />
      </View>

      {/* Location Permission Banner */}
      {!hasLocationPermission && !isLocationLoading && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            Permita o acesso à localização para uma melhor experiência
          </Text>
          <TouchableOpacity
            onPress={async () => {
              try {
                if (Platform.OS === 'android') {
                  // Check if we can ask for permission
                  const hasPermission = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                  );
                  
                  if (hasPermission) {
                    setHasLocationPermission(true);
                    return;
                  }

                  const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                      title: 'Permissão de Localização',
                      message: 'O app precisa acessar sua localização para mostrar sua posição no mapa.',
                      buttonNeutral: 'Perguntar Depois',
                      buttonNegative: 'Cancelar',
                      buttonPositive: 'OK',
                    },
                  );
                  
                  if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    setHasLocationPermission(true);
                  } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                    // User denied permanently, need to open settings
                    Alert.alert(
                      'Permissão Necessária',
                      'A permissão de localização foi negada. Por favor, habilite nas configurações do app.',
                      [
                        {text: 'Cancelar', style: 'cancel'},
                        {
                          text: 'Abrir Configurações',
                          onPress: () => {
                            const {Linking} = require('react-native');
                            Linking.openSettings();
                          },
                        },
                      ]
                    );
                  }
                } else {
                  // iOS
                  const {Linking} = require('react-native');
                  Linking.openSettings();
                }
              } catch (err) {
                console.warn('Permission request error:', err);
                Alert.alert('Erro', 'Não foi possível solicitar a permissão. Tente novamente.');
              }
            }}
            style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>Permitir</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Risk Point Popup - Requirement 3.1 */}
      <RiskPointPopup
        occurrence={selectedOccurrence}
        visible={showOccurrencePopup}
        onClose={handleCloseOccurrencePopup}
        onDelete={handleDeleteOccurrence}
      />
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
  headerContainer: {
    position: 'absolute',
    top: 50,
    left: tokens.spacing.md,
    right: tokens.spacing.md,
    zIndex: 1000,
  },
  greeting: {
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: tokens.spacing.sm,
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.borderRadius.lg,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    ...tokens.shadow.md,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: tokens.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: tokens.typography.fontSize.md,
    paddingVertical: tokens.spacing.xs,
  },
  searchResultsContainer: {
    marginTop: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.lg,
    maxHeight: 200,
    ...tokens.shadow.md,
  },
  searchResultsList: {
    borderRadius: tokens.borderRadius.lg,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  searchResultIcon: {
    fontSize: 16,
    marginRight: tokens.spacing.sm,
  },
  searchResultText: {
    flex: 1,
    fontSize: tokens.typography.fontSize.sm,
  },
  fabContainer: {
    position: 'absolute',
    right: tokens.spacing.md,
    bottom: tokens.spacing.xxl,
    gap: tokens.spacing.sm,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.md,
  },
  fabDisabled: {
    opacity: 0.5,
  },
  fabIcon: {
    fontSize: 22,
  },
  fabIconActive: {
    // Icon styling for active state
  },
  permissionBanner: {
    position: 'absolute',
    bottom: 100,
    left: tokens.spacing.md,
    right: tokens.spacing.md,
    backgroundColor: tokens.colors.warning,
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...tokens.shadow.md,
  },
  permissionText: {
    flex: 1,
    fontSize: tokens.typography.fontSize.sm,
    color: '#FFFFFF',
    marginRight: tokens.spacing.sm,
  },
  permissionButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.sm,
  },
  permissionButtonText: {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: '600',
    color: tokens.colors.warning,
  },
});

export default MapScreen;