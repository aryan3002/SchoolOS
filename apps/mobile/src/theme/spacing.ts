/**
 * SchoolOS Design System - Spacing & Layout
 *
 * Consistent spacing for visual harmony
 * Breathing room between sections
 */

// Base spacing unit (4px)
const BASE = 4;

// Spacing scale
export const spacing = {
  0: 0,
  1: BASE * 1,    // 4px
  2: BASE * 2,    // 8px
  3: BASE * 3,    // 12px
  4: BASE * 4,    // 16px
  5: BASE * 5,    // 20px
  6: BASE * 6,    // 24px
  8: BASE * 8,    // 32px
  10: BASE * 10,  // 40px
  12: BASE * 12,  // 48px
  16: BASE * 16,  // 64px
  20: BASE * 20,  // 80px
  24: BASE * 24,  // 96px
} as const;

// Border radius - Rounded corners (modern, friendly)
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

// Shadows - Gentle shadows, not flat (creates depth, aids scanning)
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Z-index layers
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
  toast: 1600,
} as const;

// Screen breakpoints (for responsive design)
export const breakpoints = {
  sm: 375,   // Small phones
  md: 414,   // Standard phones
  lg: 428,   // Large phones
  xl: 768,   // Tablets
  '2xl': 1024, // Large tablets
} as const;

// Layout constants
export const layout = {
  // Screen padding
  screenPaddingHorizontal: spacing[4],
  screenPaddingVertical: spacing[4],

  // Card dimensions
  cardPadding: spacing[4],
  cardBorderRadius: borderRadius.xl,

  // Input dimensions
  inputHeight: 48,
  inputBorderRadius: borderRadius.lg,

  // Button dimensions
  buttonHeight: 48,
  buttonHeightSmall: 36,
  buttonBorderRadius: borderRadius.lg,

  // Bottom tab bar
  tabBarHeight: 84, // Includes safe area
  tabBarPadding: spacing[2],

  // Header
  headerHeight: 56,

  // Touch targets (accessibility)
  minTouchTarget: 44, // Apple HIG minimum
} as const;

// Animation durations
export const duration = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
} as const;

// Animation easing
export const easing = {
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  spring: { damping: 15, stiffness: 150 },
} as const;

export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;
export type ShadowKey = keyof typeof shadows;
