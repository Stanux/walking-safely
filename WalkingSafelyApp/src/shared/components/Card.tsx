/**
 * Card Component for WalkingSafelyApp
 * Reusable container with shadow and borderRadius
 * Uses design tokens for styling
 * Requirements: 6.1, 6.2
 */

import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { tokens, ShadowToken } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

export type CardVariant = 'elevated' | 'outlined' | 'filled';

export interface CardProps {
  /** Card content */
  children: ReactNode;
  /** Card variant style */
  variant?: CardVariant;
  /** Shadow intensity */
  shadow?: ShadowToken;
  /** Custom padding */
  padding?: keyof typeof tokens.spacing;
  /** Custom border radius */
  borderRadius?: keyof typeof tokens.borderRadius;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Card component for grouping related content
 */
export function Card({
  children,
  variant = 'elevated',
  shadow = 'md',
  padding = 'md',
  borderRadius = 'lg',
  style,
  testID,
}: CardProps): React.JSX.Element {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getBackgroundColor = (): string => {
    switch (variant) {
      case 'elevated':
      case 'outlined':
        return isDark
          ? tokens.colors.surface.dark
          : tokens.colors.background.light;
      case 'filled':
        return isDark
          ? tokens.colors.surface.dark
          : tokens.colors.surface.light;
      default:
        return isDark
          ? tokens.colors.surface.dark
          : tokens.colors.background.light;
    }
  };

  const getBorderStyle = (): ViewStyle => {
    if (variant === 'outlined') {
      return {
        borderWidth: 1,
        borderColor: isDark
          ? tokens.colors.primary[700]
          : tokens.colors.primary[200],
      };
    }
    return {};
  };

  const getShadowStyle = (): ViewStyle => {
    if (variant === 'elevated') {
      const shadowConfig = tokens.shadow[shadow];
      return Platform.select({
        ios: {
          shadowColor: shadowConfig.shadowColor,
          shadowOffset: shadowConfig.shadowOffset,
          shadowOpacity: isDark
            ? shadowConfig.shadowOpacity * 1.5
            : shadowConfig.shadowOpacity,
          shadowRadius: shadowConfig.shadowRadius,
        },
        android: {
          elevation: shadowConfig.elevation,
        },
        default: {},
      }) as ViewStyle;
    }
    return {};
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          padding: tokens.spacing[padding],
          borderRadius: tokens.borderRadius[borderRadius],
        },
        getBorderStyle(),
        getShadowStyle(),
        style,
      ]}
      testID={testID}
      accessibilityRole="none"
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default Card;
