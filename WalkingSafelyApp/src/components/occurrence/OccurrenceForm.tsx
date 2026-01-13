/**
 * OccurrenceForm Component
 * Complete form for creating occurrence reports with validation
 * Requirements: 4.2, 4.3, 4.4, 4.6
 */

import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {OccurrenceTypeSelector} from './OccurrenceTypeSelector';
import {SeveritySelector} from './SeveritySelector';
import {SeverityValue} from '../../utils/severityLevels';
import {validateOccurrenceForm, OccurrenceFormData} from '../../store/occurrenceStore';
import type {Coordinates, OccurrenceSeverity} from '../../types/models';

export interface OccurrenceFormProps {
  coordinates: Coordinates;
  onSubmit: (data: OccurrenceFormSubmitData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
  style?: ViewStyle;
  testID?: string;
}

export interface OccurrenceFormSubmitData {
  crimeTypeId: string;
  severity: OccurrenceSeverity;
  description?: string;
  coordinates: Coordinates;
}

// Quick suggestion chips for description
const QUICK_SUGGESTIONS = [
  {id: '1', label: '🌙 Noite', text: 'Noite'},
  {id: '2', label: '🏚️ Rua deserta', text: 'Rua deserta'},
  {id: '3', label: '👥 Pouca gente', text: 'Pouca movimentação'},
  {id: '4', label: '🚗 Sem movimento', text: 'Sem movimento de carros'},
  {id: '5', label: '🏃 Correndo', text: 'Pessoa correndo'},
  {id: '6', label: '🔊 Gritos', text: 'Ouvi gritos'},
];

/**
 * QuickChip Component
 */
const QuickChip: React.FC<{
  label: string;
  isSelected: boolean;
  onPress: () => void;
}> = ({label, isSelected, onPress}) => (
  <TouchableOpacity
    style={[styles.chip, isSelected && styles.chipSelected]}
    onPress={onPress}
    activeOpacity={0.7}>
    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

/**
 * OccurrenceForm Component
 * Complete form with type selection, severity selection, and optional description
 * Requirements: 4.2, 4.3, 4.4, 4.6
 */
export const OccurrenceForm: React.FC<OccurrenceFormProps> = ({
  coordinates,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitError,
  style,
  testID,
}) => {
  const {t} = useTranslation();

  // Form state
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityValue | null>(null);
  const [description, setDescription] = useState('');
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set());

  // Validation errors
  const [typeError, setTypeError] = useState<string | null>(null);
  const [severityError, setSeverityError] = useState<string | null>(null);

  /**
   * Handle type selection
   */
  const handleTypeSelect = useCallback((typeId: string) => {
    setSelectedTypeId(typeId);
    setTypeError(null);
  }, []);

  /**
   * Handle severity selection
   */
  const handleSeveritySelect = useCallback((severity: SeverityValue) => {
    setSelectedSeverity(severity);
    setSeverityError(null);
  }, []);

  /**
   * Handle chip toggle
   */
  const handleChipToggle = useCallback((chipId: string, chipText: string) => {
    setSelectedChips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chipId)) {
        newSet.delete(chipId);
        // Remove text from description
        setDescription(d => d.replace(chipText, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim());
      } else {
        newSet.add(chipId);
        // Add text to description
        setDescription(d => d ? `${d}, ${chipText}` : chipText);
      }
      return newSet;
    });
  }, []);

  /**
   * Handle description change
   */
  const handleDescriptionChange = useCallback((text: string) => {
    setDescription(text);
  }, []);

  /**
   * Validate form and submit
   */
  const handleSubmit = useCallback(() => {
    setTypeError(null);
    setSeverityError(null);

    const formData: OccurrenceFormData = {
      crimeTypeId: selectedTypeId,
      severity: selectedSeverity as OccurrenceSeverity | null,
      description: description.trim() || undefined,
    };

    const validationError = validateOccurrenceForm(formData);

    if (validationError) {
      if (validationError === 'errors.occurrenceTypeRequired') {
        setTypeError(t('occurrence.typeRequired') || 'Selecione o tipo');
      } else if (validationError === 'errors.severityRequired' || validationError === 'errors.invalidSeverity') {
        setSeverityError(t('occurrence.severityRequired') || 'Selecione a gravidade');
      }
      return;
    }

    onSubmit({
      crimeTypeId: selectedTypeId!,
      severity: selectedSeverity as OccurrenceSeverity,
      description: description.trim() || undefined,
      coordinates,
    });
  }, [selectedTypeId, selectedSeverity, description, coordinates, onSubmit, t]);

  /**
   * Check if form can be submitted
   */
  const canSubmit = useMemo(() => {
    return selectedTypeId !== null && selectedSeverity !== null && !isSubmitting;
  }, [selectedTypeId, selectedSeverity, isSubmitting]);

  return (
    <View style={[styles.wrapper, style]} testID={testID}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          
          {/* Location Badge */}
          <View style={styles.locationBadge}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>
              {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
            </Text>
          </View>

          {/* Occurrence Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Tipo de Ocorrência <Text style={styles.required}>*</Text>
            </Text>
            <OccurrenceTypeSelector
              selectedTypeId={selectedTypeId}
              onSelectType={handleTypeSelect}
              disabled={isSubmitting}
              error={typeError || undefined}
              testID="occurrence-type-selector"
            />
          </View>

          {/* Severity Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Gravidade <Text style={styles.required}>*</Text>
            </Text>
            <SeveritySelector
              selectedSeverity={selectedSeverity}
              onSelectSeverity={handleSeveritySelect}
              disabled={isSubmitting}
              error={severityError || undefined}
              testID="severity-selector"
            />
          </View>

          {/* Quick Suggestions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitleSmall}>Adicionar detalhes rápidos</Text>
            <View style={styles.chipsContainer}>
              {QUICK_SUGGESTIONS.map(chip => (
                <QuickChip
                  key={chip.id}
                  label={chip.label}
                  isSelected={selectedChips.has(chip.id)}
                  onPress={() => handleChipToggle(chip.id, chip.text)}
                />
              ))}
            </View>
          </View>

          {/* Description Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitleSmall}>Descrição (opcional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Descreva o que aconteceu..."
              placeholderTextColor={colors.text.tertiary}
              value={description}
              onChangeText={handleDescriptionChange}
              multiline
              numberOfLines={3}
              maxLength={300}
              editable={!isSubmitting}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{description.length}/300</Text>
          </View>

          {/* Submit Error */}
          {submitError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {submitError}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={isSubmitting}
          activeOpacity={0.7}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.7}>
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Enviando...' : 'Reportar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
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
    padding: 16,
    paddingBottom: 24,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  locationText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  sectionTitleSmall: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: 10,
  },
  required: {
    color: colors.error.main,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  chipSelected: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.main,
  },
  chipText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  chipTextSelected: {
    color: colors.primary.dark,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text.primary,
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  charCount: {
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: colors.error.light,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: colors.error.dark,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.neutral.gray400,
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default OccurrenceForm;
