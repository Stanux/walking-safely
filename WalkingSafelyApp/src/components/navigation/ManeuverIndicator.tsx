/**
 * ManeuverIndicator Component
 * Displays the next maneuver with icon, text, and distance
 * Requirements: 13.1, 13.2, 13.4
 */

import React, {memo, useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors} from '../../theme/colors';
import {spacing, borderRadius, shadows} from '../../theme/spacing';
import {textStyles} from '../../theme/typography';
import type {RouteInstruction} from '../../types/models';

/**
 * Props for ManeuverIndicator component
 */
export interface ManeuverIndicatorProps {
  /** Current instruction to display */
  instruction: RouteInstruction;
  /** Distance to the maneuver in meters */
  distanceToManeuver: number;
}

/**
 * Maneuver type for icon mapping
 */
export type ManeuverType =
  | 'depart'
  | 'arrive'
  | 'turn-left'
  | 'turn-right'
  | 'turn-slight-left'
  | 'turn-slight-right'
  | 'turn-sharp-left'
  | 'turn-sharp-right'
  | 'uturn-left'
  | 'uturn-right'
  | 'uturn'
  | 'straight'
  | 'continue'
  | 'merge'
  | 'ramp-left'
  | 'ramp-right'
  | 'fork-left'
  | 'fork-right'
  | 'roundabout-left'
  | 'roundabout-right'
  | 'roundabout';

/**
 * Get maneuver icon based on maneuver type
 * Requirement 13.2: Include directional icon
 *
 * @param maneuver The maneuver type string
 * @returns Unicode icon representing the maneuver
 */
export function getManeuverIcon(maneuver: string): string {
  const icons: Record<string, string> = {
    'turn-left': '↰',
    'turn-right': '↱',
    'turn-slight-left': '↖',
    'turn-slight-right': '↗',
    'turn-sharp-left': '⬅',
    'turn-sharp-right': '➡',
    'uturn-left': '↩',
    'uturn-right': '↪',
    uturn: '↩',
    straight: '↑',
    continue: '↑',
    merge: '⤵',
    'ramp-left': '↙',
    'ramp-right': '↘',
    'fork-left': '⑂',
    'fork-right': '⑂',
    'roundabout-left': '↺',
    'roundabout-right': '↻',
    roundabout: '↻',
    arrive: '🏁',
    depart: '🚗',
  };
  return icons[maneuver] || '↑';
}

/**
 * Get background color based on maneuver type
 *
 * @param maneuver The maneuver type string
 * @returns Color string for the maneuver background
 */
export function getManeuverColor(maneuver: string): string {
  if (maneuver.includes('left')) {
    return '#2563EB'; // Blue for left turns
  }
  if (maneuver.includes('right')) {
    return '#059669'; // Green for right turns
  }
  if (maneuver === 'arrive') {
    return '#7C3AED'; // Purple for arrival
  }
  if (maneuver === 'straight' || maneuver === 'continue') {
    return '#0891B2'; // Cyan for straight
  }
  if (maneuver === 'depart') {
    return '#4CAF50'; // Green for departure
  }
  return '#2563EB'; // Default blue
}

/**
 * Format distance from meters to human-readable string
 * Requirement 13.4: Display distance to next maneuver
 *
 * @param meters Distance in meters
 * @returns Formatted distance string
 */
export function formatManeuverDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Get maneuver data for display
 * Used for testing Property 12: Maneuver Indicator Accuracy
 *
 * @param instruction The route instruction
 * @param distanceToManeuver Distance to the maneuver in meters
 * @returns Object with formatted display values
 */
export function getManeuverDisplayData(
  instruction: RouteInstruction,
  distanceToManeuver: number
): {
  icon: string;
  text: string;
  distance: string;
  backgroundColor: string;
} {
  return {
    icon: getManeuverIcon(instruction.maneuver),
    text: instruction.text,
    distance: formatManeuverDistance(distanceToManeuver),
    backgroundColor: getManeuverColor(instruction.maneuver),
  };
}


/**
 * ManeuverIndicator Component
 * Requirement 13.1: Display next maneuver at top of screen
 * Requirement 13.2: Include directional icon and text description
 * Requirement 13.4: Display distance to next maneuver
 */
const ManeuverIndicatorComponent: React.FC<ManeuverIndicatorProps> = ({
  instruction,
  distanceToManeuver,
}) => {
  // Memoize display data for performance
  const displayData = useMemo(
    () => getManeuverDisplayData(instruction, distanceToManeuver),
    [instruction, distanceToManeuver]
  );

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: displayData.backgroundColor},
      ]}
      accessibilityRole="header"
      accessibilityLabel={`${displayData.text}, ${displayData.distance}`}
    >
      {/* Left section: Icon and distance */}
      <View style={styles.leftSection}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{displayData.icon}</Text>
        </View>
        <Text style={styles.distance}>{displayData.distance}</Text>
      </View>

      {/* Right section: Instruction text */}
      <View style={styles.rightSection}>
        <Text style={styles.instructionText} numberOfLines={2}>
          {displayData.text}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadows.lg,
  },
  leftSection: {
    alignItems: 'center',
    marginRight: spacing.md,
    minWidth: 80,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  icon: {
    fontSize: 40,
    color: colors.neutral.white,
  },
  distance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral.white,
  },
  rightSection: {
    flex: 1,
  },
  instructionText: {
    ...textStyles.body,
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
});

/**
 * Memoized ManeuverIndicator to prevent unnecessary re-renders
 */
export const ManeuverIndicator = memo(ManeuverIndicatorComponent);

ManeuverIndicator.displayName = 'ManeuverIndicator';

export default ManeuverIndicator;
