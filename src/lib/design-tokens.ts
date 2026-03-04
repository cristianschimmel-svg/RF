/**
 * Rosario Finanzas - Design System Tokens
 * ========================================
 * Paleta warm/ivory con estética "Bloomberg calmado"
 * 
 * Principios:
 * - Alta densidad de información, pero respirable
 * - Colores cálidos y suaves, sin saturación excesiva
 * - Tipografía clara y jerarquía definida
 * - Un solo color de acento para acciones y highlights
 * - Positivo/Negativo sutiles (no rojo/verde brillante)
 */

// ============================================
// COLOR TOKENS
// ============================================

export const colors = {
  // Base Ivory/Warm palette
  ivory: {
    50: '#FEFDFB',   // Lightest - page background
    100: '#FBF9F5',  // Card backgrounds
    200: '#F7F3EC',  // Elevated surfaces
    300: '#F0E9DD',  // Subtle borders
    400: '#E5DACB',  // Muted text bg
    500: '#D4C4AE',  // Disabled states
    600: '#B8A589',  // Secondary text
    700: '#96836A',  // Muted text
    800: '#6B5D4D',  // Body text
    900: '#453D33',  // Headings
    950: '#2A2520',  // High contrast text
  },
  
  sand: {
    50: '#FDFCFA',
    100: '#F9F6F1',
    200: '#F3EDE3',
    300: '#E8DFD0',
    400: '#D9CBB5',
    500: '#C4B193',
    600: '#A8926E',
    700: '#877455',
    800: '#5F5240',
    900: '#3D352B',
    950: '#252119',
  },
  
  warm: {
    50: '#FFFEFB',
    100: '#FEFCF7',
    200: '#FDF8EE',
    300: '#FBF2E0',
    400: '#F7E8CC',
    500: '#F0D9AF',
    600: '#E3C389',
    700: '#CFA75F',
    800: '#A7823F',
    900: '#6E5628',
    950: '#3A2E16',
  },

  // Semantic - Financial
  positive: {
    DEFAULT: '#3D7A5C',     // Muted green for gains
    light: '#E8F5EE',       // Background for positive
    muted: '#5A9A78',       // Lighter version
    dark: '#2D5A44',        // Darker for contrast
  },
  
  negative: {
    DEFAULT: '#A65454',     // Muted red for losses
    light: '#FAEDED',       // Background for negative  
    muted: '#C47070',       // Lighter version
    dark: '#8A4545',        // Darker for contrast
  },
  
  // Accent - Single accent color
  accent: {
    DEFAULT: '#8B7355',     // Warm brown accent
    light: '#F5F0E8',       // Light accent bg
    muted: '#A8926E',       // Muted version
    dark: '#6B5540',        // Dark accent
  },

  // Neutral for dark mode
  neutral: {
    50: '#F9F8F7',
    100: '#F0EEEB',
    200: '#E1DDD8',
    300: '#C9C3BB',
    400: '#A9A198',
    500: '#8A8178',
    600: '#6E665E',
    700: '#524C46',
    800: '#383430',
    900: '#252220',
    950: '#1A1816',
  },
} as const;

export const trendStyles = {
  up: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  down: {
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
  neutral: {
    text: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-500/5',
    border: 'border-slate-500/10',
  },
} as const;

// ============================================
// SEMANTIC TOKENS
// ============================================

export const semanticTokens = {
  light: {
    // Backgrounds
    bg: {
      primary: colors.ivory[50],
      secondary: colors.ivory[100],
      tertiary: colors.ivory[200],
      muted: colors.ivory[300],
    },
    
    // Surfaces (cards, modals, etc)
    surface: {
      DEFAULT: colors.ivory[100],
      elevated: '#FFFFFF',
      sunken: colors.ivory[200],
      overlay: 'rgba(69, 61, 51, 0.4)',
    },
    
    // Text
    text: {
      primary: colors.ivory[900],
      secondary: colors.ivory[700],
      muted: colors.ivory[600],
      disabled: colors.ivory[500],
      inverse: colors.ivory[50],
    },
    
    // Borders
    border: {
      DEFAULT: colors.ivory[300],
      muted: colors.ivory[200],
      strong: colors.ivory[400],
    },
    
    // Interactive states
    interactive: {
      hover: colors.ivory[200],
      active: colors.ivory[300],
      focus: colors.accent.DEFAULT,
    },
  },
  
  dark: {
    // Warm dark - not pure black
    bg: {
      primary: '#1E1C1A',
      secondary: '#252320',
      tertiary: '#2D2A27',
      muted: '#363230',
    },
    
    surface: {
      DEFAULT: '#252320',
      elevated: '#2D2A27',
      sunken: '#1E1C1A',
      overlay: 'rgba(0, 0, 0, 0.6)',
    },
    
    text: {
      primary: '#F5F2ED',
      secondary: '#C4BDB2',
      muted: '#9A9288',
      disabled: '#6B645C',
      inverse: '#1E1C1A',
    },
    
    border: {
      DEFAULT: '#3D3935',
      muted: '#2D2A27',
      strong: '#4D4843',
    },
    
    interactive: {
      hover: '#363230',
      active: '#3D3935',
      focus: colors.accent.muted,
    },
  },
} as const;

// ============================================
// TYPOGRAPHY TOKENS
// ============================================

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
    mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'Liberation Mono', 'monospace'],
    display: ['Inter', 'system-ui', 'sans-serif'],
  },
  
  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  // Type scale - optimized for financial data density
  fontSize: {
    '2xs': { size: '0.625rem', lineHeight: '0.875rem', letterSpacing: '0.02em' },   // 10px - micro labels
    'xs': { size: '0.75rem', lineHeight: '1rem', letterSpacing: '0.01em' },          // 12px - data labels
    'sm': { size: '0.8125rem', lineHeight: '1.25rem', letterSpacing: '0' },          // 13px - body small
    'base': { size: '0.875rem', lineHeight: '1.375rem', letterSpacing: '0' },        // 14px - body
    'lg': { size: '1rem', lineHeight: '1.5rem', letterSpacing: '-0.01em' },          // 16px - body large
    'xl': { size: '1.125rem', lineHeight: '1.625rem', letterSpacing: '-0.01em' },    // 18px - h6
    '2xl': { size: '1.25rem', lineHeight: '1.75rem', letterSpacing: '-0.02em' },     // 20px - h5
    '3xl': { size: '1.5rem', lineHeight: '2rem', letterSpacing: '-0.02em' },         // 24px - h4
    '4xl': { size: '1.875rem', lineHeight: '2.25rem', letterSpacing: '-0.02em' },    // 30px - h3
    '5xl': { size: '2.25rem', lineHeight: '2.5rem', letterSpacing: '-0.03em' },      // 36px - h2
    '6xl': { size: '3rem', lineHeight: '3.25rem', letterSpacing: '-0.03em' },        // 48px - h1
  },
  
  // Predefined text styles
  styles: {
    // Headlines
    h1: { fontSize: '6xl', fontWeight: 'bold', tracking: 'tight' },
    h2: { fontSize: '5xl', fontWeight: 'bold', tracking: 'tight' },
    h3: { fontSize: '4xl', fontWeight: 'semibold', tracking: 'tight' },
    h4: { fontSize: '3xl', fontWeight: 'semibold', tracking: 'normal' },
    h5: { fontSize: '2xl', fontWeight: 'semibold', tracking: 'normal' },
    h6: { fontSize: 'xl', fontWeight: 'medium', tracking: 'normal' },
    
    // Body
    bodyLarge: { fontSize: 'lg', fontWeight: 'normal', tracking: 'normal' },
    body: { fontSize: 'base', fontWeight: 'normal', tracking: 'normal' },
    bodySmall: { fontSize: 'sm', fontWeight: 'normal', tracking: 'normal' },
    
    // Data/Financial
    dataLarge: { fontSize: '2xl', fontWeight: 'semibold', tracking: 'tight', fontFamily: 'mono' },
    data: { fontSize: 'base', fontWeight: 'medium', tracking: 'normal', fontFamily: 'mono' },
    dataSmall: { fontSize: 'xs', fontWeight: 'medium', tracking: 'wide', fontFamily: 'mono' },
    
    // Labels
    label: { fontSize: 'sm', fontWeight: 'medium', tracking: 'wide', textTransform: 'uppercase' },
    labelSmall: { fontSize: 'xs', fontWeight: 'medium', tracking: 'wider', textTransform: 'uppercase' },
    
    // Captions
    caption: { fontSize: 'xs', fontWeight: 'normal', tracking: 'normal' },
    overline: { fontSize: '2xs', fontWeight: 'semibold', tracking: 'widest', textTransform: 'uppercase' },
  },
} as const;

// ============================================
// SPACING TOKENS
// ============================================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
  32: '8rem',        // 128px
} as const;

// Component-specific spacing
export const componentSpacing = {
  // Card padding
  card: {
    sm: spacing[3],
    md: spacing[4],
    lg: spacing[6],
  },
  
  // Section gaps
  section: {
    sm: spacing[4],
    md: spacing[6],
    lg: spacing[8],
    xl: spacing[12],
  },
  
  // Data density (for tables/grids)
  data: {
    compact: spacing[1.5],
    normal: spacing[2.5],
    relaxed: spacing[3.5],
  },
  
  // Ticker/inline items
  inline: {
    tight: spacing[1],
    normal: spacing[2],
    relaxed: spacing[3],
  },
} as const;

// ============================================
// LAYOUT TOKENS
// ============================================

export const layout = {
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    '3xl': '1800px',
  },
  
  // Container widths
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1400px',
    full: '100%',
  },
  
  // Grid
  grid: {
    columns: 12,
    gutter: {
      sm: spacing[3],
      md: spacing[4],
      lg: spacing[6],
    },
  },
  
  // Z-index scale
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    toast: 1080,
  },
} as const;

// ============================================
// EFFECTS TOKENS
// ============================================

export const effects = {
  // Box shadows (warm-tinted)
  shadow: {
    none: 'none',
    soft: '0 1px 2px 0 rgba(107, 93, 77, 0.04)',
    'soft-md': '0 2px 4px -1px rgba(107, 93, 77, 0.06), 0 1px 2px -1px rgba(107, 93, 77, 0.04)',
    'soft-lg': '0 4px 6px -2px rgba(107, 93, 77, 0.08), 0 2px 4px -2px rgba(107, 93, 77, 0.04)',
    'soft-xl': '0 8px 16px -4px rgba(107, 93, 77, 0.1), 0 4px 6px -4px rgba(107, 93, 77, 0.06)',
    'soft-2xl': '0 16px 32px -8px rgba(107, 93, 77, 0.12), 0 8px 12px -6px rgba(107, 93, 77, 0.08)',
    inner: 'inset 0 1px 2px 0 rgba(107, 93, 77, 0.06)',
    // Dark mode shadows
    'dark-soft': '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
    'dark-md': '0 2px 4px -1px rgba(0, 0, 0, 0.25), 0 1px 2px -1px rgba(0, 0, 0, 0.15)',
    'dark-lg': '0 4px 6px -2px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
  },
  
  // Border radius
  radius: {
    none: '0',
    sm: '0.25rem',    // 4px
    DEFAULT: '0.375rem', // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
  },
  
  // Transitions
  transition: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
    slower: '500ms ease',
  },
  
  // Opacity
  opacity: {
    disabled: 0.5,
    muted: 0.7,
    subtle: 0.85,
  },
} as const;

// ============================================
// COMPONENT TOKENS
// ============================================

export const components = {
  // Ticker bar
  ticker: {
    height: '36px',
    itemGap: spacing[6],
    speed: '30s',
    bg: semanticTokens.light.bg.secondary,
    text: semanticTokens.light.text.secondary,
  },
  
  // Indicator cards
  indicatorCard: {
    minWidth: '180px',
    maxWidth: '280px',
    padding: spacing[4],
    gap: spacing[2],
    radius: effects.radius.lg,
  },
  
  // Data table
  dataTable: {
    headerHeight: '40px',
    rowHeight: {
      compact: '32px',
      normal: '40px',
      relaxed: '48px',
    },
    cellPadding: {
      x: spacing[3],
      y: spacing[2],
    },
  },
  
  // Sparkline
  sparkline: {
    width: '80px',
    height: '24px',
    strokeWidth: 1.5,
  },
  
  // News cards
  newsCard: {
    imageRatio: '16/9',
    padding: spacing[4],
    gap: spacing[3],
  },
  
  // Badges/Tags
  badge: {
    height: {
      sm: '20px',
      md: '24px',
      lg: '28px',
    },
    padding: {
      sm: `0 ${spacing[2]}`,
      md: `0 ${spacing[2.5]}`,
      lg: `0 ${spacing[3]}`,
    },
    fontSize: {
      sm: typography.fontSize['2xs'].size,
      md: typography.fontSize.xs.size,
      lg: typography.fontSize.sm.size,
    },
  },
  
  // Buttons
  button: {
    height: {
      sm: '32px',
      md: '40px',
      lg: '48px',
    },
    padding: {
      sm: `0 ${spacing[3]}`,
      md: `0 ${spacing[4]}`,
      lg: `0 ${spacing[6]}`,
    },
    fontSize: {
      sm: typography.fontSize.sm.size,
      md: typography.fontSize.base.size,
      lg: typography.fontSize.lg.size,
    },
    radius: effects.radius.md,
  },
  
  // Input fields
  input: {
    height: {
      sm: '32px',
      md: '40px',
      lg: '48px',
    },
    padding: {
      x: spacing[3],
    },
    radius: effects.radius.md,
  },
  
  // Tabs
  tabs: {
    height: '40px',
    gap: spacing[1],
    radius: effects.radius.md,
  },
} as const;

// ============================================
// DENSITY RULES
// ============================================

export const density = {
  // Maximum items before scroll/pagination
  limits: {
    tickerItems: 20,
    cardsPerRow: { sm: 2, md: 3, lg: 4, xl: 5 },
    tableRowsVisible: 15,
    newsCardsHome: 6,
  },
  
  // Saturation limits
  saturation: {
    maxHighlightedCards: 3,
    maxBadgesPerItem: 3,
    maxChartColors: 5,
  },
  
  // Data refresh
  refresh: {
    ticker: 60000,      // 1 min
    cards: 60000,       // 1 min
    charts: 300000,     // 5 min
    news: 600000,       // 10 min
  },
} as const;

// ============================================
// EXPORT ALL
// ============================================

export const designTokens = {
  colors,
  semanticTokens,
  typography,
  spacing,
  componentSpacing,
  layout,
  effects,
  components,
  density,
} as const;

export type DesignTokens = typeof designTokens;
export type Colors = typeof colors;
export type SemanticTokens = typeof semanticTokens;
export type Typography = typeof typography;

export default designTokens;
