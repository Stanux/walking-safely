/**
 * RouteTypeSelector Component
 * Allows user to select between fastest and safest route types
 * Requirements: 7.1, 7.2
 */

import React, {memo} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {spacing, borderRadius} from '../../theme/spacing';
import {textStyles} from '../../theme/typography';

/**
 * Route type options
 */
export type RouteType = 'fastest' | 'safest';

/**
 * Props for RouteTypeSelector component
 */
export interface RouteTypeSelectorProps {
  /** Currently selected route type */
  selectedType: RouteType;
  /** Callback when route type is changed */
  onTypeChange: (type: RouteType) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Whether route is being calculated */
  isLoading?: boolean;
}

/**
 * Get the default route type
 * Requirement 7.2: Default to safest route when user doesn't select
 */
export function getDefaultRouteType(): RouteType {
  return 'safest';
}

/**
 * Check if a route type prefers safe route
 * Used for API calls
 */
export function prefersafeRoute(type: RouteType): boolean {
  return type === 'safest';
}

/**
 * RouteTypeSelector Component
 * Provides toggle between fastest and safest route options
 */
const RouteTypeSelectorComponent: React.FC<RouteTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  disabled = false,
  isLoading = false,
}) => {
  const {t} = useTranslation();

  const handleSelectFastest = () => {
    if (!disabled && !isLoading && selectedType !== 'fastest') {
      onTypeChange('fastest');
    }
  };

  const handleSelectSafest = () => {
    if (!disabled && !isLoading && selectedType !== 'safest') {
      onTypeChange('safest');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('route.selectType') || 'Tipo de Rota'}</Text>
      <View style={styles.buttonContainer}>
        {/* Fastest Route Option */}
        <TouchableOpacity
          style={[
            styles.optionButton,
            selectedType === 'fastest' && styles.optionButtonSelected,
            (disabled || isLoading) && styles.optionButtonDisabled,
          ]}
          onPress={handleSelectFastest}
          disabled={disabled || isLoading}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{selected: selectedType === 'fastest', disabled}}
          accessibilityLabel={t('route.fastest') || 'Rota mais rápida'}
        >
          <Text style={styles.optionIcon}>⚡</Text>
          <View style={styles.optionContent}>
            <Text
              style={[
                styles.optionTitle,
                selectedType === 'fastest' && styles.optionTitleSelected,
              ]}
            >
              {t('route.fastest') || 'Mais Rápida'}
            </Text>
            <Text style={styles.optionDescription}>
              {t('route.fastestDescription') || 'Menor tempo de viagem'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Safest Route Option */}
        <TouchableOpacity
          style={[
            styles.optionButton,
            selectedType === 'safest' && styles.optionButtonSelected,
            (disabled || isLoading) && styles.optionButtonDisabled,
          ]}
          onPress={handleSelectSafest}
          disabled={disabled || isLoading}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{selected: selectedType === 'safest', disabled}}
          accessibilityLabel={t('route.safest') || 'Rota mais segura'}
        >
          <Text style={styles.optionIcon}>🛡️</Text>
          <View style={styles.optionContent}>
            <Text
              style={[
                styles.optionTitle,
                selectedType === 'safest' && styles.optionTitleSelected,
              ]}
            >
              {t('route.safest') || 'Mais Segura'}
            </Text>
            <Text style={styles.optionDescription}>
              {t('route.safestDescription') || 'Evita áreas de risco'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...textStyles.label,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    ...textStyles.label,
    color: colors.text.primary,
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: colors.primary.dark,
    fontWeight: '600',
  },
  optionDescription: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
});

/**
 * Memoized RouteTypeSelector to prevent unnecessary re-renders
 */
export const RouteTypeSelector = memo(RouteTypeSelectorComponent);

RouteTypeSelector.displayName = 'RouteTypeSelector';

export default RouteTypeSelector;
