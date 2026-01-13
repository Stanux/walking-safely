/**
 * RouteInfoPanel Component
 * Displays route information in a panel with distance, time, and risk level
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import React, {memo, useMemo} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors, getRiskColor} from '../../theme/colors';
import {spacing, borderRadius, shadows} from '../../theme/spacing';
import {textStyles} from '../../theme/typography';

/**
 * Props for RouteInfoPanel component
 */
export interface RouteInfoPanelProps {
  /** Distance in meters */
  distance: number;
  /** Duration in seconds */
  duration: number;
  /** Risk level (0-100) */
  riskLevel: number;
  /** Callback when show instructions button is pressed */
  onShowInstructions: () => void;
  /** Callback when start navigation button is pressed */
  onStartNavigation: () => void;
  /** Whether the panel is in loading state */
  isLoading?: boolean;
  /** Whether the start button is disabled */
  disabled?: boolean;
}

/**
 * Format distance from meters to human-readable string
 * Requirement 9.1: Present total distance in kilometers
 *
 * @param meters Distance in meters
 * @returns Formatted distance string (e.g., "2.5 km" or "500 m")
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format duration from seconds to human-readable string
 * Requirement 9.2: Present estimated travel time
 *
 * @param seconds Duration in seconds
 * @returns Formatted duration string (e.g., "25 min" or "1h 30min")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
}

/**
 * Get risk level label based on risk index
 * Requirement 9.3: Present calculated risk level for the route
 *
 * @param riskIndex Risk index (0-100)
 * @returns Risk level label
 */
export function getRiskLabel(riskIndex: number): string {
  if (riskIndex < 30) {
    return 'Baixo';
  }
  if (riskIndex < 70) {
    return 'Médio';
  }
  return 'Alto';
}

/**
 * Convert route data to display format
 * Used for testing Property 10: Route Info Panel Data Accuracy
 *
 * @param distance Distance in meters
 * @param duration Duration in seconds
 * @param riskLevel Risk level (0-100)
 * @returns Object with formatted display values
 */
export function convertRouteDataToDisplay(
  distance: number,
  duration: number,
  riskLevel: number
): {
  distanceDisplay: string;
  durationDisplay: string;
  riskDisplay: string;
  riskLabel: string;
} {
  return {
    distanceDisplay: formatDistance(distance),
    durationDisplay: formatDuration(duration),
    riskDisplay: `${Math.round(riskLevel)}%`,
    riskLabel: getRiskLabel(riskLevel),
  };
}


/**
 * Individual info card component for displaying a single metric
 */
interface InfoCardProps {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
  highlightColor?: string;
}

const InfoCard: React.FC<InfoCardProps> = ({
  icon,
  label,
  value,
  highlight = false,
  highlightColor,
}) => (
  <View style={[styles.infoCard, highlight && styles.infoCardHighlight]}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text
      style={[
        styles.infoValue,
        highlightColor ? {color: highlightColor} : undefined,
      ]}
    >
      {value}
    </Text>
  </View>
);

/**
 * RouteInfoPanel Component
 * Displays route information with distance, time, and risk in 3 columns
 * Requirement 9.4: Organize distance, time, and risk in a single line with three columns
 */
const RouteInfoPanelComponent: React.FC<RouteInfoPanelProps> = ({
  distance,
  duration,
  riskLevel,
  onShowInstructions,
  onStartNavigation,
  isLoading = false,
  disabled = false,
}) => {
  const {t} = useTranslation();

  // Memoize formatted values
  const displayData = useMemo(
    () => convertRouteDataToDisplay(distance, duration, riskLevel),
    [distance, duration, riskLevel]
  );

  const riskColor = useMemo(() => getRiskColor(riskLevel), [riskLevel]);
  const isHighRisk = riskLevel >= 70;

  return (
    <View style={styles.container}>
      {/* Requirement 9.4: Three columns for distance, time, and risk */}
      <View style={styles.infoCardsContainer}>
        {/* Distance Card - Requirement 9.1 */}
        <InfoCard
          icon="📏"
          label={t('navigation.distance') || 'Distância'}
          value={displayData.distanceDisplay}
        />

        {/* Duration Card - Requirement 9.2 */}
        <InfoCard
          icon="⏱️"
          label={t('navigation.duration') || 'Tempo'}
          value={displayData.durationDisplay}
        />

        {/* Risk Card - Requirement 9.3 */}
        <InfoCard
          icon="🛡️"
          label={t('navigation.riskIndex') || 'Risco'}
          value={`${displayData.riskDisplay} - ${displayData.riskLabel}`}
          highlight={isHighRisk}
          highlightColor={riskColor}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        {/* Requirement 9.5: Button to view navigation instructions */}
        <TouchableOpacity
          style={styles.instructionsButton}
          onPress={onShowInstructions}
          disabled={isLoading || disabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('navigation.showInstructions') || 'Ver instruções'}
        >
          <Text style={styles.instructionsButtonIcon}>📋</Text>
          <Text style={styles.instructionsButtonText}>
            {t('navigation.showInstructions') || 'Instruções'}
          </Text>
        </TouchableOpacity>

        {/* Requirement 9.6: Action button to start the route */}
        <TouchableOpacity
          style={[
            styles.startButton,
            (isLoading || disabled) && styles.startButtonDisabled,
          ]}
          onPress={onStartNavigation}
          disabled={isLoading || disabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('navigation.startNavigation') || 'Iniciar navegação'}
        >
          <Text style={styles.startButtonIcon}>▶️</Text>
          <Text style={styles.startButtonText}>
            {isLoading
              ? t('navigation.calculating') || 'Calculando...'
              : t('navigation.startNavigation') || 'Iniciar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.lg,
  },
  infoCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  infoCardHighlight: {
    borderWidth: 1,
    borderColor: colors.warning.main,
  },
  infoIcon: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  infoLabel: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  infoValue: {
    ...textStyles.label,
    color: colors.text.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  instructionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  instructionsButtonIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  instructionsButtonText: {
    ...textStyles.label,
    color: colors.text.primary,
  },
  startButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  startButtonDisabled: {
    backgroundColor: colors.neutral.gray400,
    opacity: 0.7,
  },
  startButtonIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  startButtonText: {
    ...textStyles.label,
    color: colors.neutral.white,
    fontWeight: '600',
  },
});

/**
 * Memoized RouteInfoPanel to prevent unnecessary re-renders
 */
export const RouteInfoPanel = memo(RouteInfoPanelComponent);

RouteInfoPanel.displayName = 'RouteInfoPanel';

export default RouteInfoPanel;
