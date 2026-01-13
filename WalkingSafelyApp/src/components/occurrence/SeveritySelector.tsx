/**
 * SeveritySelector Component
 * Selectable severity levels with color indicators
 * Requirements: 4.3
 */

import React, {useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Animated,
  Platform,
  Vibration,
} from 'react-native';
import {tokens} from '@/shared/theme/tokens';
import {useTheme} from '@/shared/theme/ThemeProvider';
import type {OccurrenceSeverity} from '@/types/models';

/**
 * Severity level definition
 */
export interface SeverityLevel {
  value: OccurrenceSeverity;
  label: string;
  color: string;
}

/**
 * Available severity levels
 * Requirement 4.3: Baixa, Média, Alta, Crítica
 */
export const SEVERITY_LEVELS: SeverityLevel[] = [
  {value: 'low', label: 'Baixa', color: '#FFC107'},
  {value: 'medium', label: 'Média', color: '#FF9800'},
  {value: 'high', label: 'Alta', color: '#F44336'},
  {value: 'critical', label: 'Crítica', color: '#9C27B0'},
];

export interface SeveritySelectorProps {
  selectedSeverity: OccurrenceSeverity | null;
  onSelectSeverity: (severity: OccurrenceSeverity) => void;
  disabled?: boolean;
  error?: string;
  style?: ViewStyle;
  testID?: string;
}

/**
 * SeverityButton with animation
 */
const SeverityButton: React.FC<{
  level: SeverityLevel;
  isSelected: boolean;
  isDark: boolean;
  disabled: boolean;
  onPress: () => void;
}> = ({level, isSelected, isDark, disabled, onPress}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevSelected = useRef(isSelected);

  useEffect(() => {
    if (isSelected && !prevSelected.current) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.92,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      if (Platform.OS !== 'web') {
        Vibration.vibrate(10);
      }
    }
    prevSelected.current = isSelected;
  }, [isSelected, scaleAnim]);

  return (
    <Animated.View style={[styles.buttonWrapper, {transform: [{scale: scaleAnim}]}]}>
      <TouchableOpacity
        style={[
          styles.severityButton,
          {
            borderColor: level.color,
            backgroundColor: isSelected
              ? level.color
              : isDark
                ? tokens.colors.surface.dark
                : tokens.colors.background.light,
          },
          disabled && styles.severityButtonDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="radio"
        accessibilityState={{selected: isSelected, disabled}}
        accessibilityLabel={level.label}
        testID={`severity-${level.value}`}>
        <View style={[styles.colorDot, {backgroundColor: isSelected ? '#FFF' : level.color}]} />
        <Text
          style={[
            styles.severityText,
            {color: isSelected ? '#FFFFFF' : level.color},
          ]}>
          {level.label}
        </Text>
        {isSelected && <Text style={styles.checkIcon}>✓</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * SeveritySelector Component
 * Displays a row of selectable severity levels with colors
 * Requirement 4.3: Allow selection of severity level (Baixa, Média, Alta, Crítica)
 */
export const SeveritySelector: React.FC<SeveritySelectorProps> = ({
  selectedSeverity,
  onSelectSeverity,
  disabled = false,
  error,
  style,
  testID,
}) => {
  const {theme} = useTheme();
  const isDark = theme === 'dark';

  const handleSelect = (level: SeverityLevel) => {
    if (!disabled) {
      onSelectSeverity(level.value);
    }
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.row}>
        {SEVERITY_LEVELS.map(level => (
          <SeverityButton
            key={level.value}
            level={level}
            isSelected={selectedSeverity === level.value}
            isDark={isDark}
            disabled={disabled}
            onPress={() => handleSelect(level)}
          />
        ))}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  buttonWrapper: {
    flex: 1,
  },
  severityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: tokens.borderRadius.md,
    borderWidth: 2,
    gap: 4,
  },
  severityButtonDisabled: {
    opacity: 0.5,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  checkIcon: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  errorText: {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.error,
    marginTop: tokens.spacing.xs,
  },
});

export default SeveritySelector;
