/**
 * SchoolOS Design System - Main Theme Export
 *
 * Simple theme export - no context providers needed
 */

import { colors, darkColors, ColorScheme } from './colors';
import { textStyles, fontSize, fontWeight, lineHeight, fontFamily } from './typography';
import { spacing, borderRadius, shadows, layout, duration, zIndex } from './spacing';

export interface Theme {
  colors: ColorScheme;
  textStyles: typeof textStyles;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  lineHeight: typeof lineHeight;
  fontFamily: typeof fontFamily;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  layout: typeof layout;
  duration: typeof duration;
  zIndex: typeof zIndex;
  isDark: boolean;
}

export const lightTheme: Theme = {
  colors,
  textStyles,
  fontSize,
  fontWeight,
  lineHeight,
  fontFamily,
  spacing,
  borderRadius,
  shadows,
  layout,
  duration,
  zIndex,
  isDark: false,
};

export const darkTheme: Theme = {
  ...lightTheme,
  colors: darkColors as ColorScheme,
  isDark: true,
};

// Simple theme hook - returns light theme by default
// No context needed - just import and use
export function useTheme(): Theme {
  return lightTheme;
}

// Export the default theme for direct imports
export const theme = lightTheme;

// Re-export everything
export * from './colors';
export * from './typography';
export * from './spacing';
