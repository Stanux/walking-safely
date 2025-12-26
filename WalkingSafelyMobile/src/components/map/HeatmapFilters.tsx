/**
 * HeatmapFilters Component
 * Provides filter controls for heatmap data (crime type, period)
 * Requirements: 9.4, 9.5
 */

import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {spacing, shadows} from '../../theme/spacing';
import {textStyles} from '../../theme/typography';
import {HeatmapFilters as HeatmapFiltersType} from '../../types/models';

/**
 * Period options for heatmap filtering
 */
export type HeatmapPeriod = 'last_24h' | 'last_7d' | 'last_30d';

/**
 * Props for HeatmapFilters component
 */
export interface HeatmapFiltersProps {
  /** Current filter values */
  filters: HeatmapFiltersType | null;
  /** Callback when filters change */
  onFiltersChange: (filters: HeatmapFiltersType | null) => void;
  /** Available crime types for filtering */
  crimeTypes?: Array<{id: string; name: string; localizedName?: string}>;
  /** Whether the filter panel is visible */
  visible?: boolean;
  /** Callback to close the filter panel */
  onClose?: () => void;
}

/**
 * Period options with translation keys
 */
const PERIOD_OPTIONS: Array<{value: HeatmapPeriod; labelKey: string}> = [
  {value: 'last_24h', labelKey: 'heatmap.last24h'},
  {value: 'last_7d', labelKey: 'heatmap.last7days'},
  {value: 'last_30d', labelKey: 'heatmap.last30days'},
];

/**
 * Default crime types if none provided
 */
const DEFAULT_CRIME_TYPES = [
  {id: 'robbery', name: 'Robbery', localizedName: undefined},
  {id: 'theft', name: 'Theft', localizedName: undefined},
  {id: 'assault', name: 'Assault', localizedName: undefined},
  {id: 'harassment', name: 'Harassment', localizedName: undefined},
  {id: 'vandalism', name: 'Vandalism', localizedName: undefined},
  {
    id: 'suspiciousActivity',
    name: 'Suspicious Activity',
    localizedName: undefined,
  },
];

/**
 * Chip component for selectable options
 */
interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const Chip: React.FC<ChipProps> = ({label, selected, onPress}) => (
  <TouchableOpacity
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="checkbox"
    accessibilityState={{checked: selected}}>
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

/**
 * HeatmapFilters Component
 * Allows users to filter heatmap data by crime type and time period
 */
export const HeatmapFiltersComponent: React.FC<HeatmapFiltersProps> = ({
  filters,
  onFiltersChange,
  crimeTypes = DEFAULT_CRIME_TYPES,
  visible = true,
  onClose,
}) => {
  const {t} = useTranslation();

  // Local state for filter selections
  const [selectedCrimeTypes, setSelectedCrimeTypes] = useState<string[]>(
    filters?.crimeTypes || [],
  );
  const [selectedPeriod, setSelectedPeriod] = useState<
    HeatmapPeriod | undefined
  >(filters?.period);

  /**
   * Toggle crime type selection
   */
  const handleToggleCrimeType = useCallback((crimeTypeId: string) => {
    setSelectedCrimeTypes(prev => {
      if (prev.includes(crimeTypeId)) {
        return prev.filter(id => id !== crimeTypeId);
      }
      return [...prev, crimeTypeId];
    });
  }, []);

  /**
   * Select period
   */
  const handleSelectPeriod = useCallback((period: HeatmapPeriod) => {
    setSelectedPeriod(prev => (prev === period ? undefined : period));
  }, []);

  /**
   * Apply filters
   */
  const handleApplyFilters = useCallback(() => {
    const newFilters: HeatmapFiltersType | null =
      selectedCrimeTypes.length > 0 || selectedPeriod
        ? {
            crimeTypes:
              selectedCrimeTypes.length > 0 ? selectedCrimeTypes : undefined,
            period: selectedPeriod,
          }
        : null;

    onFiltersChange(newFilters);
    onClose?.();
  }, [selectedCrimeTypes, selectedPeriod, onFiltersChange, onClose]);

  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    setSelectedCrimeTypes([]);
    setSelectedPeriod(undefined);
    onFiltersChange(null);
    onClose?.();
  }, [onFiltersChange, onClose]);

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = useMemo(
    () => selectedCrimeTypes.length > 0 || selectedPeriod !== undefined,
    [selectedCrimeTypes, selectedPeriod],
  );

  /**
   * Get localized crime type name
   */
  const getCrimeTypeName = useCallback(
    (crimeType: {id: string; name: string; localizedName?: string}) => {
      // Try to get translation from i18n first
      const translationKey = `crimeTypes.${crimeType.id}`;
      const translated = t(translationKey);

      // If translation exists and is different from key, use it
      if (translated !== translationKey) {
        return translated;
      }

      // Otherwise use localizedName or fallback to name
      return crimeType.localizedName || crimeType.name;
    },
    [t],
  );

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('heatmap.filters')}</Text>
        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Crime Type Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('heatmap.crimeType')}</Text>
          <View style={styles.chipsContainer}>
            {crimeTypes.map(crimeType => (
              <Chip
                key={crimeType.id}
                label={getCrimeTypeName(crimeType)}
                selected={selectedCrimeTypes.includes(crimeType.id)}
                onPress={() => handleToggleCrimeType(crimeType.id)}
              />
            ))}
          </View>
        </View>

        {/* Period Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('heatmap.period')}</Text>
          <View style={styles.chipsContainer}>
            {PERIOD_OPTIONS.map(option => (
              <Chip
                key={option.value}
                label={t(option.labelKey)}
                selected={selectedPeriod === option.value}
                onPress={() => handleSelectPeriod(option.value)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClearFilters}
          disabled={!hasActiveFilters}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('heatmap.clearFilters')}>
          <Text
            style={[
              styles.buttonText,
              styles.clearButtonText,
              !hasActiveFilters && styles.buttonTextDisabled,
            ]}>
            {t('heatmap.clearFilters')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.applyButton]}
          onPress={handleApplyFilters}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('heatmap.applyFilters')}>
          <Text style={[styles.buttonText, styles.applyButtonText]}>
            {t('heatmap.applyFilters')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Modal wrapper for HeatmapFilters
 */
export interface HeatmapFiltersModalProps extends HeatmapFiltersProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

export const HeatmapFiltersModal: React.FC<HeatmapFiltersModalProps> = ({
  visible,
  onClose,
  ...filterProps
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      accessibilityViewIsModal={true}>
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <HeatmapFiltersComponent
            {...filterProps}
            visible={true}
            onClose={onClose}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  title: {
    ...textStyles.h3,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.text.secondary,
  },
  content: {
    maxHeight: 300,
    paddingHorizontal: spacing.base,
  },
  section: {
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    ...textStyles.label,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.neutral.gray100,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
  },
  chipSelected: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.main,
  },
  chipText: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  chipTextSelected: {
    color: colors.primary.dark,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
  },
  applyButton: {
    backgroundColor: colors.primary.main,
  },
  buttonText: {
    ...textStyles.button,
  },
  clearButtonText: {
    color: colors.text.secondary,
  },
  applyButtonText: {
    color: colors.neutral.white,
  },
  buttonTextDisabled: {
    color: colors.text.tertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.xl,
  },
});

export default HeatmapFiltersComponent;
