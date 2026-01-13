/**
 * Tamagui Configuration for WalkingSafelyApp
 * Configures light and dark themes using design tokens
 * Requirements: 5.1, 5.3
 */

import { createTamagui, createTokens } from '@tamagui/core';
import { tokens as appTokens } from './tokens';

// Create Tamagui tokens from our design tokens
const tamaguiTokens = createTokens({
  color: {
    // Primary colors
    primary50: appTokens.colors.primary[50],
    primary100: appTokens.colors.primary[100],
    primary200: appTokens.colors.primary[200],
    primary300: appTokens.colors.primary[300],
    primary400: appTokens.colors.primary[400],
    primary500: appTokens.colors.primary[500],
    primary600: appTokens.colors.primary[600],
    primary700: appTokens.colors.primary[700],
    primary800: appTokens.colors.primary[800],
    primary900: appTokens.colors.primary[900],
    // Semantic colors
    success: appTokens.colors.success,
    warning: appTokens.colors.warning,
    error: appTokens.colors.error,
    info: appTokens.colors.info,
    // Light theme colors
    backgroundLight: appTokens.colors.background.light,
    surfaceLight: appTokens.colors.surface.light,
    textPrimaryLight: appTokens.colors.text.primary.light,
    textSecondaryLight: appTokens.colors.text.secondary.light,
    // Dark theme colors
    backgroundDark: appTokens.colors.background.dark,
    surfaceDark: appTokens.colors.surface.dark,
    textPrimaryDark: appTokens.colors.text.primary.dark,
    textSecondaryDark: appTokens.colors.text.secondary.dark,
  },
  space: {
    xs: appTokens.spacing.xs,
    sm: appTokens.spacing.sm,
    md: appTokens.spacing.md,
    lg: appTokens.spacing.lg,
    xl: appTokens.spacing.xl,
    xxl: appTokens.spacing.xxl,
    true: appTokens.spacing.md,
  },
  size: {
    xs: appTokens.spacing.xs,
    sm: appTokens.spacing.sm,
    md: appTokens.spacing.md,
    lg: appTokens.spacing.lg,
    xl: appTokens.spacing.xl,
    xxl: appTokens.spacing.xxl,
    true: appTokens.spacing.md,
  },
  radius: {
    sm: appTokens.borderRadius.sm,
    md: appTokens.borderRadius.md,
    lg: appTokens.borderRadius.lg,
    xl: appTokens.borderRadius.xl,
    full: appTokens.borderRadius.full,
    true: appTokens.borderRadius.md,
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
});

// Light theme configuration
const lightTheme = {
  background: appTokens.colors.background.light,
  backgroundHover: appTokens.colors.surface.light,
  backgroundPress: appTokens.colors.primary[50],
  backgroundFocus: appTokens.colors.surface.light,
  color: appTokens.colors.text.primary.light,
  colorHover: appTokens.colors.text.primary.light,
  colorPress: appTokens.colors.text.primary.light,
  colorFocus: appTokens.colors.text.primary.light,
  borderColor: appTokens.colors.primary[200],
  borderColorHover: appTokens.colors.primary[300],
  borderColorPress: appTokens.colors.primary[400],
  borderColorFocus: appTokens.colors.primary[500],
  placeholderColor: appTokens.colors.text.secondary.light,
  // Custom semantic tokens
  primary: appTokens.colors.primary[500],
  primaryHover: appTokens.colors.primary[600],
  primaryPress: appTokens.colors.primary[700],
  secondary: appTokens.colors.text.secondary.light,
  surface: appTokens.colors.surface.light,
  success: appTokens.colors.success,
  warning: appTokens.colors.warning,
  error: appTokens.colors.error,
  info: appTokens.colors.info,
};

// Dark theme configuration
const darkTheme = {
  background: appTokens.colors.background.dark,
  backgroundHover: appTokens.colors.surface.dark,
  backgroundPress: appTokens.colors.primary[900],
  backgroundFocus: appTokens.colors.surface.dark,
  color: appTokens.colors.text.primary.dark,
  colorHover: appTokens.colors.text.primary.dark,
  colorPress: appTokens.colors.text.primary.dark,
  colorFocus: appTokens.colors.text.primary.dark,
  borderColor: appTokens.colors.primary[700],
  borderColorHover: appTokens.colors.primary[600],
  borderColorPress: appTokens.colors.primary[500],
  borderColorFocus: appTokens.colors.primary[400],
  placeholderColor: appTokens.colors.text.secondary.dark,
  // Custom semantic tokens
  primary: appTokens.colors.primary[400],
  primaryHover: appTokens.colors.primary[300],
  primaryPress: appTokens.colors.primary[200],
  secondary: appTokens.colors.text.secondary.dark,
  surface: appTokens.colors.surface.dark,
  success: appTokens.colors.success,
  warning: appTokens.colors.warning,
  error: appTokens.colors.error,
  info: appTokens.colors.info,
};

// Create Tamagui configuration
export const tamaguiConfig = createTamagui({
  tokens: tamaguiTokens,
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
  defaultTheme: 'light',
});

export type TamaguiConfig = typeof tamaguiConfig;
export type ThemeName = 'light' | 'dark';

// Type declaration for Tamagui
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends TamaguiConfig {}
}
