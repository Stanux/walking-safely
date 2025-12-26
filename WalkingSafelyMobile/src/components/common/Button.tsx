/**
 * Button Component
 * Reusable button with multiple variants and states
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import {colors} from '../../theme/colors';
import {textStyles} from '../../theme/typography';
import {spacing, componentSpacing, shadows} from '../../theme/spacing';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
  onPress,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  const buttonStyles: ViewStyle[] = [
    styles.base,
    styles[variant],
    styles[`${size}Size`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    isDisabled && styles[`${variant}Disabled`],
    style,
  ].filter(Boolean) as ViewStyle[];

  const textStyles_: TextStyle[] = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    isDisabled && styles.disabledText,
    textStyle,
  ].filter(Boolean) as TextStyle[];

  const getLoaderColor = (): string => {
    if (variant === 'outline' || variant === 'ghost') {
      return colors.primary.main;
    }
    return colors.primary.contrast;
  };

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{disabled: isDisabled}}
      {...rest}>
      {loading ? (
        <ActivityIndicator size="small" color={getLoaderColor()} />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text style={textStyles_}>{title}</Text>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: componentSpacing.buttonBorderRadius,
    gap: spacing.sm,
    ...shadows.sm,
  },

  // Variants
  primary: {
    backgroundColor: colors.primary.main,
  },
  secondary: {
    backgroundColor: colors.secondary.main,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary.main,
    ...shadows.none,
  },
  ghost: {
    backgroundColor: 'transparent',
    ...shadows.none,
  },
  danger: {
    backgroundColor: colors.error.main,
  },

  // Sizes
  smallSize: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 32,
  },
  mediumSize: {
    paddingHorizontal: componentSpacing.buttonPaddingHorizontal,
    paddingVertical: componentSpacing.buttonPaddingVertical,
    minHeight: 44,
  },
  largeSize: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    minHeight: 52,
  },

  fullWidth: {
    width: '100%',
  },

  disabled: {
    opacity: 0.5,
  },

  primaryDisabled: {
    backgroundColor: colors.neutral.gray300,
  },
  secondaryDisabled: {
    backgroundColor: colors.neutral.gray300,
  },
  outlineDisabled: {
    borderColor: colors.neutral.gray300,
  },
  ghostDisabled: {},
  dangerDisabled: {
    backgroundColor: colors.neutral.gray300,
  },

  // Text styles
  text: {
    ...textStyles.button,
    textAlign: 'center',
  },
  primaryText: {
    color: colors.primary.contrast,
  },
  secondaryText: {
    color: colors.secondary.contrast,
  },
  outlineText: {
    color: colors.primary.main,
  },
  ghostText: {
    color: colors.primary.main,
  },
  dangerText: {
    color: colors.neutral.white,
  },

  smallText: {
    ...textStyles.buttonSmall,
  },
  mediumText: {
    ...textStyles.button,
  },
  largeText: {
    ...textStyles.buttonLarge,
  },

  disabledText: {
    color: colors.neutral.gray500,
  },
});

export default Button;
