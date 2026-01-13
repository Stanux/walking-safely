/**
 * OccurrenceTypeSelector Component
 * Selectable list of occurrence types with icons
 * Requirements: 4.2
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

/**
 * Occurrence type definition
 */
export interface OccurrenceType {
  id: string;
  name: string;
  icon: string;
}

/**
 * Available occurrence types
 * Requirement 4.2: Roubo, Furto, Agressão, Assédio, Vandalismo, Atividade Suspeita, Baixa Iluminação
 */
export const OCCURRENCE_TYPES: OccurrenceType[] = [
  {id: '1', name: 'Roubo', icon: '🔫'},
  {id: '2', name: 'Furto', icon: '👜'},
  {id: '3', name: 'Agressão', icon: '👊'},
  {id: '4', name: 'Assédio', icon: '⚠️'},
  {id: '5', name: 'Vandalismo', icon: '🔨'},
  {id: '6', name: 'Suspeito', icon: '👁️'},
  {id: '7', name: 'Sem Luz', icon: '💡'},
  {id: '8', name: 'Obstruída', icon: '🚧'},
];

export interface OccurrenceTypeSelectorProps {
  selectedTypeId: string | null;
  onSelectType: (typeId: string) => void;
  disabled?: boolean;
  error?: string;
  style?: ViewStyle;
  testID?: string;
}

/**
 * TypeButton with animation
 */
const TypeButton: React.FC<{
  type: OccurrenceType;
  isSelected: boolean;
  isDark: boolean;
  disabled: boolean;
  onPress: () => void;
}> = ({type, isSelected, isDark, disabled, onPress}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevSelected = useRef(isSelected);

  useEffect(() => {
    if (isSelected && !prevSelected.current) {
      // Animate on selection
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
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
      
      // Haptic feedback
      if (Platform.OS !== 'web') {
        Vibration.vibrate(10);
      }
    }
    prevSelected.current = isSelected;
  }, [isSelected, scaleAnim]);

  return (
    <Animated.View style={{transform: [{scale: scaleAnim}]}}>
      <TouchableOpacity
        style={[
          styles.typeButton,
          {
            backgroundColor: isDark
              ? tokens.colors.surface.dark
              : tokens.colors.surface.light,
            borderColor: isSelected
              ? tokens.colors.primary[500]
              : isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.1)',
          },
          isSelected && {
            backgroundColor: isDark
              ? tokens.colors.primary[900]
              : tokens.colors.primary[50],
            borderWidth: 3,
          },
          disabled && styles.typeButtonDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="radio"
        accessibilityState={{selected: isSelected, disabled}}
        accessibilityLabel={type.name}
        testID={`occurrence-type-${type.id}`}>
        <Text style={[styles.icon, isSelected && styles.iconSelected]}>
          {type.icon}
        </Text>
        <Text
          style={[
            styles.typeText,
            {
              color: isSelected
                ? tokens.colors.primary[500]
                : isDark
                  ? tokens.colors.text.secondary.dark
                  : tokens.colors.text.secondary.light,
            },
            isSelected && styles.typeTextSelected,
          ]}
          numberOfLines={1}>
          {type.name}
        </Text>
        {isSelected && <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>}
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * OccurrenceTypeSelector Component
 * Displays a 4-column grid of selectable occurrence types with large icons
 * Requirement 4.2: Allow selection of occurrence type
 */
export const OccurrenceTypeSelector: React.FC<OccurrenceTypeSelectorProps> = ({
  selectedTypeId,
  onSelectType,
  disabled = false,
  error,
  style,
  testID,
}) => {
  const {theme} = useTheme();
  const isDark = theme === 'dark';

  const handleSelect = (type: OccurrenceType) => {
    if (!disabled) {
      onSelectType(type.id);
    }
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.grid}>
        {OCCURRENCE_TYPES.map(type => (
          <TypeButton
            key={type.id}
            type={type}
            isSelected={selectedTypeId === type.id}
            isDark={isDark}
            disabled={disabled}
            onPress={() => handleSelect(type)}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  typeButton: {
    width: 78,
    height: 78,
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    position: 'relative',
  },
  typeButtonDisabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 32,
    marginBottom: 2,
  },
  iconSelected: {
    transform: [{scale: 1.1}],
  },
  typeText: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  typeTextSelected: {
    fontWeight: '700',
  },
  checkmark: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tokens.colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.error,
    marginTop: tokens.spacing.xs,
  },
});

export default OccurrenceTypeSelector;
