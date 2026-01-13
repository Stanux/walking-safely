/**
 * RiskPointMarker Component
 * Visual marker for risk points on the map with severity-based coloring
 * Requirements: 2.4
 */

import React, {memo} from 'react';
import {StyleSheet, TouchableOpacity, View, Text} from 'react-native';
import {Occurrence} from '../../types/models';
import {getSeverityColor, SeverityValue} from '../../utils/severityLevels';

export interface RiskPointMarkerProps {
  occurrence: Occurrence;
  onPress: (occurrence: Occurrence) => void;
}

/**
 * Get marker color based on severity level
 * Requirement 2.4: Risk points differentiated visually by severity level
 */
export function getMarkerColor(severity: SeverityValue): string {
  return getSeverityColor(severity);
}

/**
 * RiskPointMarker - Displays a risk point on the map
 * Color is determined by severity level (Req 2.4):
 * - low: yellow (#FFC107)
 * - medium: orange (#FF9800)
 * - high: red (#F44336)
 * - critical: purple (#9C27B0)
 */
export const RiskPointMarker: React.FC<RiskPointMarkerProps> = memo(
  ({occurrence, onPress}) => {
    const markerColor = getMarkerColor(occurrence.severity);

    const handlePress = () => {
      onPress(occurrence);
    };

    return (
      <TouchableOpacity
        onPress={handlePress}
        style={styles.container}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Risk point: ${occurrence.crimeType.name}, severity ${occurrence.severity}`}>
        <View style={[styles.marker, {backgroundColor: markerColor}]}>
          <Text style={styles.icon}>⚠</Text>
        </View>
      </TouchableOpacity>
    );
  },
);

RiskPointMarker.displayName = 'RiskPointMarker';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  icon: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default RiskPointMarker;
