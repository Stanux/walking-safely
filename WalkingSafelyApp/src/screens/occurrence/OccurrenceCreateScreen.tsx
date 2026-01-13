/**
 * OccurrenceCreateScreen
 * Screen for creating new occurrence reports from long press on map
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.2
 */

import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import {tokens} from '@/shared/theme/tokens';
import {useTheme} from '@/shared/theme/ThemeProvider';
import {Button} from '@/shared/components/Button';
import {OccurrenceTypeSelector} from '@/components/occurrence/OccurrenceTypeSelector';
import {SeveritySelector} from '@/components/occurrence/SeveritySelector';
import {useOccurrenceStore} from '@/store/occurrenceStore';
import type {Coordinates, OccurrenceSeverity, CreateOccurrenceData} from '@/types/models';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

type AppStackParamList = {
  MapScreen: undefined;
  OccurrenceCreate: {coordinates: Coordinates};
};

type OccurrenceCreateScreenProps = NativeStackScreenProps<AppStackParamList, 'OccurrenceCreate'>;

/**
 * OccurrenceCreateScreen Component
 * Integrates OccurrenceForm with store and navigation
 * Requirements: 4.1, 4.5, 5.2
 */
export const OccurrenceCreateScreen: React.FC<OccurrenceCreateScreenProps> = ({
  navigation,
  route,
}) => {
  const {theme} = useTheme();
  const isDark = theme === 'dark';
  const coordinates = route.params?.coordinates;

  // Store
  const {createOccurrence, isCreating, createError, clearCreateError} =
    useOccurrenceStore();

  // Form state
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<OccurrenceSeverity | null>(null);
  const [description, setDescription] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Handle form submission
   * Requirement 4.5: Register occurrence with captured coordinates
   * Requirement 4.6: Validate required fields
   * Requirement 5.2: Return to map showing new risk point
   */
  const handleSubmit = useCallback(async () => {
    setSubmitError(null);
    clearCreateError();

    // Requirement 4.6: Validate required fields
    if (!selectedTypeId) {
      setSubmitError('Selecione o tipo de ocorrência');
      return;
    }

    if (!selectedSeverity) {
      setSubmitError('Selecione o nível de severidade');
      return;
    }

    if (!coordinates) {
      setSubmitError('Coordenadas não disponíveis');
      return;
    }

    try {
      // Build create occurrence data
      // Requirement 4.5: Coordinates from long press are preserved
      const createData: CreateOccurrenceData = {
        location: coordinates,
        timestamp: new Date().toISOString(),
        crimeTypeId: selectedTypeId,
        severity: selectedSeverity,
        description: description.trim() || undefined,
      };

      // Create occurrence via store
      await createOccurrence(createData);

      // Requirement 5.2: Return to map screen
      navigation.goBack();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Erro ao registrar ocorrência';
      setSubmitError(errorMessage);
    }
  }, [
    selectedTypeId,
    selectedSeverity,
    coordinates,
    description,
    createOccurrence,
    clearCreateError,
    navigation,
  ]);

  /**
   * Handle back button press
   */
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // If no coordinates provided, show error
  if (!coordinates) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {backgroundColor: isDark ? tokens.colors.background.dark : tokens.colors.background.light},
        ]}>
        <View style={styles.errorContainer}>
          <Text
            style={[
              styles.errorTitle,
              {color: tokens.colors.error},
            ]}>
            Erro
          </Text>
          <Text
            style={[
              styles.errorMessage,
              {color: isDark ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light},
            ]}>
            Coordenadas não disponíveis. Tente novamente.
          </Text>
          <Button
            variant="primary"
            size="lg"
            onPress={handleBack}>
            Voltar
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {backgroundColor: isDark ? tokens.colors.background.dark : tokens.colors.background.light},
      ]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'},
        ]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.headerBackButton}
          accessibilityRole="button"
          accessibilityLabel="Voltar">
          <Text
            style={[
              styles.headerBackText,
              {color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light},
            ]}>
            ←
          </Text>
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            {color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light},
          ]}>
          Reportar Ocorrência
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Location Info */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light},
            ]}>
            📍 Localização
          </Text>
          <View
            style={[
              styles.locationCard,
              {backgroundColor: isDark ? tokens.colors.surface.dark : tokens.colors.surface.light},
            ]}>
            <Text
              style={[
                styles.locationText,
                {color: isDark ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light},
              ]}>
              {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
            </Text>
          </View>
        </View>

        {/* Occurrence Type Selection - Requirement 4.2 */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light},
            ]}>
            Tipo de Ocorrência *
          </Text>
          <OccurrenceTypeSelector
            selectedTypeId={selectedTypeId}
            onSelectType={setSelectedTypeId}
          />
        </View>

        {/* Severity Selection - Requirement 4.3 */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light},
            ]}>
            Nível de Severidade *
          </Text>
          <SeveritySelector
            selectedSeverity={selectedSeverity}
            onSelectSeverity={setSelectedSeverity}
          />
        </View>

        {/* Description - Requirement 4.4 */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light},
            ]}>
            Descrição (opcional)
          </Text>
          <TextInput
            style={[
              styles.descriptionInput,
              {
                backgroundColor: isDark ? tokens.colors.surface.dark : tokens.colors.surface.light,
                color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light,
              },
            ]}
            placeholder="Descreva o que aconteceu..."
            placeholderTextColor={isDark ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
        </View>

        {/* Error Message */}
        {(submitError || createError) && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>
              ⚠️ {submitError || createError}
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <Button
            variant="primary"
            size="lg"
            onPress={handleSubmit}
            loading={isCreating}
            disabled={isCreating}
            testID="submit-occurrence-button">
            {isCreating ? 'Enviando...' : 'Registrar Ocorrência'}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
  },
  headerBackButton: {
    padding: tokens.spacing.sm,
  },
  headerBackText: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xxl,
  },
  section: {
    marginBottom: tokens.spacing.lg,
  },
  sectionTitle: {
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '600',
    marginBottom: tokens.spacing.sm,
  },
  locationCard: {
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
  },
  locationText: {
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: 'monospace',
  },
  descriptionInput: {
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    fontSize: tokens.typography.fontSize.md,
    minHeight: 100,
  },
  errorBanner: {
    backgroundColor: tokens.colors.error,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  errorBannerText: {
    color: '#FFFFFF',
    fontSize: tokens.typography.fontSize.sm,
    textAlign: 'center',
  },
  submitContainer: {
    marginTop: tokens.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.xl,
  },
  errorTitle: {
    fontSize: tokens.typography.fontSize.xxl,
    fontWeight: 'bold',
    marginBottom: tokens.spacing.md,
  },
  errorMessage: {
    fontSize: tokens.typography.fontSize.md,
    textAlign: 'center',
    marginBottom: tokens.spacing.xl,
  },
});

export default OccurrenceCreateScreen;
