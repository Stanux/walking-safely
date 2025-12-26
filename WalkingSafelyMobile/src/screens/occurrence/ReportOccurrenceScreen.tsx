/**
 * Report Occurrence Screen
 * Screen for reporting security occurrences
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */

import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {textStyles} from '../../theme/typography';
import {spacing} from '../../theme/spacing';
import {
  Button,
  LoadingIndicator,
  ErrorMessage,
  Input,
} from '../../components/common';
import {useLocation} from '../../hooks/useLocation';
import {useNetworkContext} from '../../contexts';
import {occurrencesService} from '../../services/api';
import {cacheService} from '../../services/cache';
import type {ReportOccurrenceScreenProps} from '../../types/navigation';
import type {
  Coordinates,
  CrimeType,
  CrimeCategory,
  OccurrenceSeverity,
  CreateOccurrenceData,
} from '../../types/models';
import type {RateLimitInfo} from '../../types/api';

/**
 * Severity option for selection
 */
interface SeverityOption {
  value: OccurrenceSeverity;
  label: string;
  color: string;
}

/**
 * ReportOccurrenceScreen Component
 * Allows users to report security occurrences with GPS location, crime type, and severity
 */
export const ReportOccurrenceScreen: React.FC<ReportOccurrenceScreenProps> = ({
  navigation,
  route,
}) => {
  const {t} = useTranslation();
  const initialLocation = route.params?.location;

  // Location hook
  const {
    coordinates: currentCoordinates,
    hasPermission,
    isLoading: isLocationLoading,
    getCurrentPosition,
    requestPermission,
  } = useLocation({
    autoRequestPermission: true,
    updateMapStore: false,
  });

  // Network state - Requirement 14.5: Disable features when offline
  const {isConnected, status} = useNetworkContext();
  const isOffline = status === 'offline' || !isConnected;

  // State
  const [location, setLocation] = useState<Coordinates | null>(
    initialLocation || null,
  );
  const [timestamp] = useState<string>(new Date().toISOString());
  const [crimeTypes, setCrimeTypes] = useState<CrimeType[]>([]);
  const [_crimeCategories, setCrimeCategories] = useState<CrimeCategory[]>([]);
  const [selectedCrimeType, setSelectedCrimeType] = useState<CrimeType | null>(
    null,
  );
  const [selectedSeverity, setSelectedSeverity] =
    useState<OccurrenceSeverity | null>(null);
  const [description, setDescription] = useState('');
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(
    null,
  );

  // Loading states
  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(true);
  const [isLoadingRateLimit, setIsLoadingRateLimit] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Error states
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Severity options with colors
   */
  const severityOptions: SeverityOption[] = useMemo(
    () => [
      {
        value: 'low',
        label: t('occurrence.severity.low'),
        color: colors.success.main,
      },
      {
        value: 'medium',
        label: t('occurrence.severity.medium'),
        color: colors.warning.main,
      },
      {
        value: 'high',
        label: t('occurrence.severity.high'),
        color: colors.error.main,
      },
      {
        value: 'critical',
        label: t('occurrence.severity.critical'),
        color: colors.error.dark,
      },
    ],
    [t],
  );

  /**
   * Check if form is valid
   * Requirement 14.5: Disable submission when offline
   */
  const isFormValid = useMemo(() => {
    return (
      location !== null &&
      selectedCrimeType !== null &&
      selectedSeverity !== null &&
      (rateLimitInfo === null || rateLimitInfo.remaining > 0) &&
      !isOffline
    );
  }, [location, selectedCrimeType, selectedSeverity, rateLimitInfo, isOffline]);

  /**
   * Check if rate limit is exceeded
   */
  const isRateLimitExceeded = useMemo(() => {
    return rateLimitInfo !== null && rateLimitInfo.remaining <= 0;
  }, [rateLimitInfo]);

  /**
   * Load crime taxonomy from cache or API
   * Requirement 10.3: Display crime type selection
   */
  const loadTaxonomy = useCallback(async () => {
    setIsLoadingTaxonomy(true);
    setTaxonomyError(null);

    try {
      // Try to get from cache first
      const cachedTaxonomy = await cacheService.getTaxonomy();

      if (cachedTaxonomy) {
        setCrimeTypes(cachedTaxonomy.crimeTypes);
        setCrimeCategories(cachedTaxonomy.categories);
      } else {
        // For now, use mock data - in production this would come from API
        // The backend should provide a /crime-types endpoint
        const mockCrimeTypes: CrimeType[] = [
          {
            id: '1',
            name: 'Robbery',
            categoryId: '1',
            localizedName: t('crimeTypes.robbery'),
          },
          {
            id: '2',
            name: 'Theft',
            categoryId: '1',
            localizedName: t('crimeTypes.theft'),
          },
          {
            id: '3',
            name: 'Assault',
            categoryId: '2',
            localizedName: t('crimeTypes.assault'),
          },
          {
            id: '4',
            name: 'Harassment',
            categoryId: '2',
            localizedName: t('crimeTypes.harassment'),
          },
          {
            id: '5',
            name: 'Vandalism',
            categoryId: '3',
            localizedName: t('crimeTypes.vandalism'),
          },
          {
            id: '6',
            name: 'Suspicious Activity',
            categoryId: '4',
            localizedName: t('crimeTypes.suspiciousActivity'),
          },
        ];

        const mockCategories: CrimeCategory[] = [
          {id: '1', name: 'Property Crimes', parentId: null},
          {id: '2', name: 'Violent Crimes', parentId: null},
          {id: '3', name: 'Public Order', parentId: null},
          {id: '4', name: 'Other', parentId: null},
        ];

        setCrimeTypes(mockCrimeTypes);
        setCrimeCategories(mockCategories);

        // Cache the taxonomy
        await cacheService.setTaxonomy({
          crimeTypes: mockCrimeTypes,
          categories: mockCategories,
        });
      }
    } catch (error) {
      setTaxonomyError(t('errors.unknown'));
    } finally {
      setIsLoadingTaxonomy(false);
    }
  }, [t]);

  /**
   * Load rate limit information
   * Requirement 10.7: Display remaining reports
   */
  const loadRateLimitInfo = useCallback(async () => {
    setIsLoadingRateLimit(true);

    try {
      const info = await occurrencesService.getRateLimitInfo();
      setRateLimitInfo(info);
    } catch (error) {
      // If we can't get rate limit info, assume user can submit
      setRateLimitInfo({limit: 5, remaining: 5, resetsAt: ''});
    } finally {
      setIsLoadingRateLimit(false);
    }
  }, []);

  /**
   * Capture GPS location
   * Requirement 10.2: Automatically capture GPS coordinates
   */
  const captureLocation = useCallback(async () => {
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
      setLocation({
        latitude: position.latitude,
        longitude: position.longitude,
      });
    }
  }, [hasPermission, requestPermission, getCurrentPosition, t]);

  /**
   * Handle crime type selection
   */
  const handleSelectCrimeType = useCallback((crimeType: CrimeType) => {
    setSelectedCrimeType(crimeType);
    setSubmitError(null);
  }, []);

  /**
   * Handle severity selection
   */
  const handleSelectSeverity = useCallback((severity: OccurrenceSeverity) => {
    setSelectedSeverity(severity);
    setSubmitError(null);
  }, []);

  /**
   * Handle form submission
   * Requirements: 10.4, 10.5, 10.6
   */
  const handleSubmit = useCallback(async () => {
    if (!isFormValid || !location || !selectedCrimeType || !selectedSeverity) {
      return;
    }

    // Check rate limit
    if (isRateLimitExceeded) {
      setSubmitError(t('occurrence.noReportsLeft'));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const data: CreateOccurrenceData = {
        location,
        timestamp,
        crimeTypeId: selectedCrimeType.id,
        severity: selectedSeverity,
        description: description.trim() || undefined,
      };

      const response = await occurrencesService.create(data);

      // Update rate limit info
      setRateLimitInfo(prev =>
        prev
          ? {...prev, remaining: response.remainingReports}
          : {limit: 5, remaining: response.remainingReports, resetsAt: ''},
      );

      // Show success message
      Alert.alert(t('common.success'), t('occurrence.submitSuccess'), [
        {
          text: t('common.ok'),
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      // Handle specific error cases
      if (error?.code === 'INVALID_LOCATION') {
        setSubmitError(t('occurrence.invalidLocation'));
      } else if (error?.code === 'RATE_LIMIT_EXCEEDED') {
        setSubmitError(t('occurrence.rateLimitExceeded'));
        // Refresh rate limit info
        loadRateLimitInfo();
      } else {
        setSubmitError(t('occurrence.submitError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isFormValid,
    isRateLimitExceeded,
    location,
    timestamp,
    selectedCrimeType,
    selectedSeverity,
    description,
    navigation,
    loadRateLimitInfo,
    t,
  ]);

  /**
   * Load data on mount
   */
  useEffect(() => {
    loadTaxonomy();
    loadRateLimitInfo();
  }, [loadTaxonomy, loadRateLimitInfo]);

  /**
   * Capture location if not provided
   */
  useEffect(() => {
    if (!location && currentCoordinates) {
      setLocation(currentCoordinates);
    } else if (!location && !initialLocation) {
      captureLocation();
    }
  }, [location, currentCoordinates, initialLocation, captureLocation]);

  /**
   * Render loading state
   */
  if (isLoadingTaxonomy) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingIndicator variant="fullscreen" message={t('common.loading')} />
      </SafeAreaView>
    );
  }

  /**
   * Render error state
   */
  if (taxonomyError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <ErrorMessage message={taxonomyError} variant="banner" />
          <Button
            title={t('common.retry')}
            onPress={loadTaxonomy}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t('occurrence.title')}</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Rate Limit Info */}
          {!isLoadingRateLimit && rateLimitInfo && (
            <View
              style={[
                styles.rateLimitBanner,
                isRateLimitExceeded && styles.rateLimitBannerExceeded,
              ]}>
              <Text
                style={[
                  styles.rateLimitText,
                  isRateLimitExceeded && styles.rateLimitTextExceeded,
                ]}>
                {isRateLimitExceeded
                  ? t('occurrence.noReportsLeft')
                  : t('occurrence.reportsRemaining', {
                      count: rateLimitInfo.remaining,
                    })}
              </Text>
            </View>
          )}

          {/* Offline Warning Banner */}
          {isOffline && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>
                ⚠️ {t('errors.offline')} - {t('errors.offlineMessage')}
              </Text>
            </View>
          )}

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('location.permissionRequired')}
            </Text>
            <View style={styles.locationContainer}>
              {location ? (
                <View style={styles.locationInfo}>
                  <Text style={styles.locationText}>
                    📍 {location.latitude.toFixed(6)},{' '}
                    {location.longitude.toFixed(6)}
                  </Text>
                  <TouchableOpacity
                    onPress={captureLocation}
                    disabled={isLocationLoading}
                    style={styles.refreshLocationButton}>
                    <Text style={styles.refreshLocationText}>
                      {isLocationLoading ? '...' : '🔄'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={captureLocation}
                  disabled={isLocationLoading}
                  style={styles.captureLocationButton}>
                  <Text style={styles.captureLocationText}>
                    {isLocationLoading
                      ? t('common.loading')
                      : t('location.grantPermission')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Crime Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('occurrence.selectType')}
            </Text>
            <View style={styles.optionsGrid}>
              {crimeTypes.map(crimeType => (
                <TouchableOpacity
                  key={crimeType.id}
                  style={[
                    styles.optionButton,
                    selectedCrimeType?.id === crimeType.id &&
                      styles.optionButtonSelected,
                  ]}
                  onPress={() => handleSelectCrimeType(crimeType)}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: selectedCrimeType?.id === crimeType.id,
                  }}>
                  <Text
                    style={[
                      styles.optionText,
                      selectedCrimeType?.id === crimeType.id &&
                        styles.optionTextSelected,
                    ]}>
                    {crimeType.localizedName || crimeType.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Severity Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('occurrence.selectSeverity')}
            </Text>
            <View style={styles.severityContainer}>
              {severityOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.severityButton,
                    {borderColor: option.color},
                    selectedSeverity === option.value && {
                      backgroundColor: option.color,
                    },
                  ]}
                  onPress={() => handleSelectSeverity(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: selectedSeverity === option.value,
                  }}>
                  <Text
                    style={[
                      styles.severityText,
                      {color: option.color},
                      selectedSeverity === option.value &&
                        styles.severityTextSelected,
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description (Optional) */}
          <View style={styles.section}>
            <Input
              label={t('occurrence.description')}
              placeholder={t('occurrence.description')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
              containerStyle={styles.descriptionInput}
            />
          </View>

          {/* Error Message */}
          {submitError && (
            <ErrorMessage
              message={submitError}
              variant="banner"
              style={styles.errorBanner}
            />
          )}

          {/* Submit Button */}
          <Button
            title={
              isSubmitting ? t('occurrence.submitting') : t('occurrence.submit')
            }
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!isFormValid || isSubmitting || isRateLimitExceeded}
            fullWidth
            size="large"
            style={styles.submitButton}
            testID="submit-occurrence-button"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    fontSize: 24,
    color: colors.text.primary,
  },
  title: {
    ...textStyles.h2,
    color: colors.text.primary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  rateLimitBanner: {
    backgroundColor: colors.info.light,
    borderRadius: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  rateLimitBannerExceeded: {
    backgroundColor: colors.error.light,
  },
  rateLimitText: {
    ...textStyles.bodySmall,
    color: colors.info.dark,
    textAlign: 'center',
  },
  rateLimitTextExceeded: {
    color: colors.error.dark,
  },
  offlineBanner: {
    backgroundColor: colors.warning.main,
    borderRadius: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  offlineBannerText: {
    ...textStyles.bodySmall,
    color: colors.neutral.black,
    textAlign: 'center',
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  locationContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.sm,
    padding: spacing.md,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationText: {
    ...textStyles.body,
    color: colors.text.secondary,
    flex: 1,
  },
  refreshLocationButton: {
    padding: spacing.sm,
  },
  refreshLocationText: {
    fontSize: 20,
  },
  captureLocationButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  captureLocationText: {
    ...textStyles.body,
    color: colors.primary.main,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.primary,
  },
  optionButtonSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  optionText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  optionTextSelected: {
    color: colors.primary.dark,
    fontWeight: '600',
  },
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  severityButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.sm,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  severityText: {
    ...textStyles.bodySmall,
    fontWeight: '600',
  },
  severityTextSelected: {
    color: colors.neutral.white,
  },
  descriptionInput: {
    marginTop: 0,
  },
  errorBanner: {
    marginBottom: spacing.lg,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  retryButton: {
    marginTop: spacing.lg,
  },
});

export default ReportOccurrenceScreen;
