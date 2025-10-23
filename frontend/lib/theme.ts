/**
 * Remo Design System - Monochrome Theme
 * Black and White Cognitive Workspace
 */

export const RemoTheme = {
  // Brand Colors - Monochrome Only
  colors: {
    primary: {
      50: '#ffffff',
      100: '#f9fafb',
      200: '#f3f4f6',
      300: '#e5e7eb',
      400: '#d1d5db',
      500: '#9ca3af', // Mid gray
      600: '#6b7280',
      700: '#4b5563',
      800: '#374151',
      900: '#1f2937',
    },
    monochrome: {
      50: '#ffffff',
      100: '#fafafa',
      200: '#f5f5f5',
      300: '#e8e8e8',
      400: '#d4d4d4',
      500: '#a3a3a3',
      600: '#737373',
      700: '#525252',
      800: '#404040',
      900: '#262626',
      950: '#0a0a0a',
    },
    success: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e8e8e8',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    warning: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e8e8e8',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    danger: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e8e8e8',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    dark: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a',
    },
  },

  // Monochrome Backgrounds
  gradients: {
    primary: 'bg-gradient-to-br from-gray-900 via-gray-800 to-black',
    neural: 'bg-gradient-to-br from-black via-gray-900 to-gray-800',
    cognition: 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600',
    knowledge: 'bg-gradient-to-br from-gray-100 via-gray-50 to-white',
    analytics: 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-50',
    dark: 'bg-gradient-to-br from-black via-gray-900 to-gray-800',
    subtle: 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50',
  },

  // Monochrome Text
  textGradients: {
    primary: 'bg-gradient-to-r from-gray-900 to-black bg-clip-text text-transparent',
    neural: 'bg-gradient-to-r from-black to-gray-800 bg-clip-text text-transparent',
    cognition: 'bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent',
    knowledge: 'bg-gradient-to-r from-gray-700 to-gray-500 bg-clip-text text-transparent',
  },

  // Shadows - Monochrome
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
    glow: 'shadow-lg shadow-gray-500/50',
    neuralGlow: 'shadow-lg shadow-gray-700/50',
    inner: 'shadow-inner',
  },

  // Border Radius
  radius: {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    full: 'rounded-full',
  },

  // Transitions
  transitions: {
    fast: 'transition-all duration-150 ease-in-out',
    normal: 'transition-all duration-300 ease-in-out',
    slow: 'transition-all duration-500 ease-in-out',
    spring: 'transition-all duration-300 ease-out',
  },

  // Glass Effect - Monochrome
  glass: {
    light: 'bg-white/10 backdrop-blur-lg',
    medium: 'bg-white/20 backdrop-blur-xl',
    dark: 'bg-black/10 backdrop-blur-lg',
    colored: 'bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl',
  },

  // Card Styles - Monochrome
  cards: {
    elevated: 'bg-white rounded-2xl shadow-xl border border-gray-200',
    glass: 'bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200',
    flat: 'bg-gray-50 rounded-lg border border-gray-300',
    gradient: 'bg-gradient-to-br from-white to-gray-100 rounded-2xl shadow-lg',
  },

  // Status Colors - Monochrome
  status: {
    online: '#000000',
    away: '#737373',
    busy: '#404040',
    offline: '#a3a3a3',
  },

  // Expertise Levels - Monochrome
  expertise: {
    beginner: '#d4d4d4',
    intermediate: '#a3a3a3',
    advanced: '#525252',
    expert: '#000000',
  },

  // Priority Colors - Monochrome
  priority: {
    low: '#d4d4d4',
    medium: '#737373',
    high: '#000000',
  },

  // Task Status - Monochrome
  taskStatus: {
    pending: '#a3a3a3',
    due: '#525252',
    completed: '#000000',
  },
};

// Animation Presets
export const animations = {
  fadeIn: 'animate-fadeIn',
  slideUp: 'animate-slideUp',
  slideDown: 'animate-slideDown',
  slideLeft: 'animate-slideLeft',
  slideRight: 'animate-slideRight',
  scaleIn: 'animate-scaleIn',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  spin: 'animate-spin',
};

// Z-Index Layers
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};

// Spacing Scale
export const spacing = {
  xs: '0.5rem',    // 8px
  sm: '0.75rem',   // 12px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  '4xl': '6rem',   // 96px
};

export default RemoTheme;
