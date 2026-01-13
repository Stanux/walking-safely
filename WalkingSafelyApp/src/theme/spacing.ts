/**
 * Spacing Configuration for Walking Safely Mobile
 * Defines consistent spacing values throughout the app
 */

// Base spacing unit (4px)
const BASE_UNIT = 4;

// Spacing scale
export const spacing = {
  none: 0,
  xs: BASE_UNIT, // 4
  sm: BASE_UNIT * 2, // 8
  md: BASE_UNIT * 3, // 12
  base: BASE_UNIT * 4, // 16
  lg: BASE_UNIT * 5, // 20
  xl: BASE_UNIT * 6, // 24
  '2xl': BASE_UNIT * 8, // 32
  '3xl': BASE_UNIT * 10, // 40
  '4xl': BASE_UNIT * 12, // 48
  '5xl': BASE_UNIT * 16, // 64
} as const;

// Border radius
export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  base: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

// Border width
export const borderWidth = {
  none: 0,
  hairline: 0.5,
  thin: 1,
  base: 1.5,
  thick: 2,
} as const;

// Shadow definitions
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

// Icon sizes
export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  base: 24,
  lg: 28,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
} as const;

// Hit slop for touch targets (accessibility)
export const hitSlop = {
  sm: {top: 8, bottom: 8, left: 8, right: 8},
  base: {top: 12, bottom: 12, left: 12, right: 12},
  lg: {top: 16, bottom: 16, left: 16, right: 16},
} as const;

// Screen padding
export const screenPadding = {
  horizontal: spacing.base, // 16
  vertical: spacing.base, // 16
  top: spacing.lg, // 20
  bottom: spacing['2xl'], // 32 (for bottom navigation)
} as const;

// Component-specific spacing
export const componentSpacing = {
  // Card
  cardPadding: spacing.base,
  cardMargin: spacing.sm,
  cardBorderRadius: borderRadius.lg,

  // Button
  buttonPaddingHorizontal: spacing.lg,
  buttonPaddingVertical: spacing.md,
  buttonBorderRadius: borderRadius.base,

  // Input
  inputPaddingHorizontal: spacing.base,
  inputPaddingVertical: spacing.md,
  inputBorderRadius: borderRadius.base,

  // List item
  listItemPadding: spacing.base,
  listItemGap: spacing.sm,

  // Modal
  modalPadding: spacing.xl,
  modalBorderRadius: borderRadius.xl,

  // Map controls
  mapControlSize: 48,
  mapControlMargin: spacing.base,
  mapControlBorderRadius: borderRadius.full,

  // Search bar
  searchBarHeight: 48,
  searchBarBorderRadius: borderRadius.full,

  // Bottom sheet
  bottomSheetBorderRadius: borderRadius['2xl'],
  bottomSheetPadding: spacing.xl,

  // Alert banner
  alertBannerPadding: spacing.base,
  alertBannerBorderRadius: borderRadius.lg,
} as const;

// Z-index layers
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
} as const;

export type Spacing = keyof typeof spacing;
export type BorderRadius = keyof typeof borderRadius;
export type Shadow = keyof typeof shadows;
export type IconSize = keyof typeof iconSize;
