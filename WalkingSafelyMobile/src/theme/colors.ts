/**
 * Color Palette for Walking Safely Mobile
 * Includes risk-based colors (green, yellow, red) for safety indicators
 */

export const colors = {
  // Primary Colors
  primary: {
    main: '#2563EB', // Blue
    light: '#60A5FA',
    dark: '#1D4ED8',
    contrast: '#FFFFFF',
  },

  // Secondary Colors
  secondary: {
    main: '#7C3AED', // Purple
    light: '#A78BFA',
    dark: '#5B21B6',
    contrast: '#FFFFFF',
  },

  // Risk Colors (for route and heatmap visualization)
  risk: {
    low: '#22C55E', // Green - Safe areas (risk index 0-30)
    medium: '#EAB308', // Yellow - Moderate risk (risk index 31-69)
    high: '#EF4444', // Red - High risk areas (risk index 70-100)
    lowLight: '#86EFAC',
    mediumLight: '#FDE047',
    highLight: '#FCA5A5',
  },

  // Semantic Colors
  success: {
    main: '#22C55E',
    light: '#86EFAC',
    dark: '#16A34A',
  },

  warning: {
    main: '#F59E0B',
    light: '#FCD34D',
    dark: '#D97706',
  },

  error: {
    main: '#EF4444',
    light: '#FCA5A5',
    dark: '#DC2626',
  },

  info: {
    main: '#3B82F6',
    light: '#93C5FD',
    dark: '#2563EB',
  },

  // Neutral Colors
  neutral: {
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
  },

  // Background Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    dark: '#1F2937',
  },

  // Text Colors
  text: {
    primary: '#111827',
    secondary: '#4B5563',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
    link: '#2563EB',
  },

  // Border Colors
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
  },

  // Map-specific Colors
  map: {
    userMarker: '#2563EB',
    destinationMarker: '#EF4444',
    routeDefault: '#2563EB',
    routeSafe: '#22C55E',
    routeWarning: '#EAB308',
    routeDanger: '#EF4444',
    heatmapLow: 'rgba(34, 197, 94, 0.4)',
    heatmapMedium: 'rgba(234, 179, 8, 0.5)',
    heatmapHigh: 'rgba(239, 68, 68, 0.6)',
  },

  // Overlay Colors
  overlay: {
    light: 'rgba(255, 255, 255, 0.8)',
    dark: 'rgba(0, 0, 0, 0.5)',
    modal: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

/**
 * Get risk color based on risk index value
 * @param riskIndex - Value from 0 to 100
 * @returns Appropriate color for the risk level
 */
export const getRiskColor = (riskIndex: number): string => {
  if (riskIndex < 30) {
    return colors.risk.low;
  }
  if (riskIndex < 70) {
    return colors.risk.medium;
  }
  return colors.risk.high;
};

/**
 * Get risk color with transparency for heatmap
 * @param riskIndex - Value from 0 to 100
 * @returns Appropriate color with transparency
 */
export const getHeatmapColor = (riskIndex: number): string => {
  if (riskIndex < 30) {
    return colors.map.heatmapLow;
  }
  if (riskIndex < 70) {
    return colors.map.heatmapMedium;
  }
  return colors.map.heatmapHigh;
};

export type Colors = typeof colors;
