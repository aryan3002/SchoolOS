/**
 * SchoolOS Design System - Color Palette
 *
 * Brand Personality: Trustworthy, warm, clear, modern
 * Think public library, not enterprise SaaS
 */

// Primary: Calm, trustworthy blue (education association, but not cliché)
export const colors = {
  // Primary Blues - Trust & Reliability
  primary: {
    50: '#E8F1F8',
    100: '#C5DCF0',
    200: '#9EC5E6',
    300: '#77ADDC',
    400: '#5A9AD4',
    500: '#3D87CC', // Main primary
    600: '#3577B8',
    700: '#2B639E',
    800: '#224F84',
    900: '#1E3A5F', // Dark primary
  },

  // Accent: Action-oriented amber/orange for deadlines, required items
  accent: {
    50: '#FFF8E6',
    100: '#FFEFC2',
    200: '#FFE499',
    300: '#FFD866',
    400: '#FFCC40',
    500: '#FFB800', // Main accent
    600: '#E6A600',
    700: '#CC9300',
    800: '#B38000',
    900: '#996D00',
  },

  // Success: Reassuring green for confirmations, completed items
  success: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50', // Main success
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  },

  // Warning: Amber for important but non-critical
  warning: {
    50: '#FFF3E0',
    100: '#FFE0B2',
    200: '#FFCC80',
    300: '#FFB74D',
    400: '#FFA726',
    500: '#FF9800', // Main warning
    600: '#FB8C00',
    700: '#F57C00',
    800: '#EF6C00',
    900: '#E65100',
  },

  // Error: Reserved for true errors only
  error: {
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#F44336', // Main error
    600: '#E53935',
    700: '#D32F2F',
    800: '#C62828',
    900: '#B71C1C',
  },

  // Info: for neutral informative badges and statuses
  info: {
    50: '#E6F4FF',
    100: '#C7E3FF',
    200: '#A6D2FF',
    300: '#7BB9FF',
    400: '#4FA1FF',
    500: '#1F8CFF', // Main info
    600: '#1977E6',
    700: '#125CBC',
    800: '#0C4392',
    900: '#082D66',
  },

  // Neutral: Warm grays, not cold (system feels human)
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // Semantic colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#F1F5F9',
    inverse: '#1E3A5F',
  },

  text: {
    primary: '#1A1A2E',
    secondary: '#4A5568',
    tertiary: '#718096',
    inverse: '#FFFFFF',
    link: '#3D87CC',
  },

  border: {
    light: '#E2E8F0',
    default: '#CBD5E0',
    dark: '#A0AEC0',
  },

  // Role-specific accent colors
  roles: {
    parent: '#3D87CC',   // Primary blue
    teacher: '#5C6BC0',  // Indigo
    student: '#26A69A',  // Teal
    admin: '#7E57C2',    // Purple
  },

  // Overlay colors
  overlay: {
    light: 'rgba(255, 255, 255, 0.8)',
    dark: 'rgba(0, 0, 0, 0.5)',
    blur: 'rgba(255, 255, 255, 0.9)',
  },
} as const;

// Dark mode colors
export const darkColors = {
  ...colors,
  background: {
    primary: '#121212',
    secondary: '#1E1E1E',
    tertiary: '#2D2D2D',
    inverse: '#FFFFFF',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B0B0B0',
    tertiary: '#808080',
    inverse: '#1A1A2E',
    link: '#5A9AD4',
  },
  border: {
    light: '#2D2D2D',
    default: '#404040',
    dark: '#606060',
  },
} as const;

export type ColorScheme = typeof colors;
