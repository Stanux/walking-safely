/**
 * Button Component for WalkingSafelyApp
 * Reusable button with variants: primary, secondary, outline, ghost
 * Supports states: loading, disabled
 * Uses design tokens for styling
 * Requirements: 6.1, 6.2, 6.3
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  /** Button text content */
  children: string;
  /** Button variant style */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Whether the button is in loading state */
  loading?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Callback when button is pressed */
  onPress?: () => void;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Custom text style */
  textStyle?: StyleProp<TextStyle>;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Button component with multiple variants and states
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onPress,
  style,
  textStyle,
  accessibilityLabel,
  testID,
}: ButtonProps): React.JSX.Element {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const isDisabled = disabled || loading;

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    const baseContainer: ViewStyle = {
      borderRadius: tokens.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    const baseText: TextStyle = {
      fontFamily: tokens.typography.fontFamily.semiBold,
    };

    switch (variant) {
      case 'primary':
        return {
          container: {
            ...baseContainer,
            backgroundColor: isDisabled
              ? tokens.colors.primary[300]
              : tokens.colors.primary[500],
          },
          text: {
            ...baseText,
            color: '#FFFFFF',
          },
        };
      case 'secondary':
        return {
          container: {
            ...baseContainer,
            backgroundColor: isDisabled
              ? isDark
                ? tokens.colors.surface.dark
                : tokens.colors.surface.light
              : isDark
                ? tokens.colors.primary[800]
                : tokens.colors.primary[100],
          },
          text: {
            ...baseText,
            color: isDisabled
              ? tokens.colors.text.secondary[isDark ? 'dark' : 'light']
              : tokens.colors.primary[isDark ? 300 : 700],
          },
        };
      case 'outline':
        return {
          container: {
            ...baseContainer,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: isDisabled
              ? tokens.colors.primary[300]
              : tokens.colors.primary[500],
          },
          text: {
            ...baseText,
            color: isDisabled
              ? tokens.colors.primary[300]
              : tokens.colors.primary[isDark ? 400 : 500],
          },
        };
      case 'ghost':
        return {
          container: {
            ...baseContainer,
            backgroundColor: 'transparent',
          },
          text: {
            ...baseText,
            color: isDisabled
              ? tokens.colors.text.secondary[isDark ? 'dark' : 'light']
              : tokens.colors.primary[isDark ? 400 : 500],
          },
        };
      default:
        return {
          container: baseContainer,
          text: baseText,
        };
    }
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          container: {
            paddingVertical: tokens.spacing.xs,
            paddingHorizontal: tokens.spacing.sm,
            minHeight: 32,
          },
          text: {
            fontSize: tokens.typography.fontSize.sm,
          },
        };
      case 'md':
        return {
          container: {
            paddingVertical: tokens.spacing.sm,
            paddingHorizontal: tokens.spacing.md,
            minHeight: 44,
          },
          text: {
            fontSize: tokens.typography.fontSize.md,
          },
        };
      case 'lg':
        return {
          container: {
            paddingVertical: tokens.spacing.md,
            paddingHorizontal: tokens.spacing.lg,
            minHeight: 52,
          },
          text: {
            fontSize: tokens.typography.fontSize.lg,
          },
        };
      default:
        return {
          container: {},
          text: {},
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        variantStyles.container,
        sizeStyles.container,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityLabel={accessibilityLabel || children}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyles.text.color}
          style={styles.loader}
        />
      ) : null}
      <Text
        style={[
          variantStyles.text,
          sizeStyles.text,
          loading && styles.loadingText,
          textStyle,
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginRight: tokens.spacing.xs,
  },
  loadingText: {
    opacity: 0.7,
  },
});

export default Button;
