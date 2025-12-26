/**
 * Theme Exports
 * Central export point for all theme configurations
 */

export * from './colors';
export * from './typography';
export * from './spacing';

// Re-export commonly used items for convenience
import {colors, getRiskColor, getHeatmapColor} from './colors';
import {textStyles, fontSize, fontWeight, fontFamily} from './typography';
import {
  spacing,
  borderRadius,
  shadows,
  iconSize,
  screenPadding,
  componentSpacing,
  zIndex,
} from './spacing';

export const theme = {
  colors,
  textStyles,
  fontSize,
  fontWeight,
  fontFamily,
  spacing,
  borderRadius,
  shadows,
  iconSize,
  screenPadding,
  componentSpacing,
  zIndex,
  // Utility functions
  getRiskColor,
  getHeatmapColor,
} as const;

export type Theme = typeof theme;
