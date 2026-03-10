import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm/Ivory Base Palette
        ivory: {
          50: '#FEFDFB',
          100: '#FBF9F5',
          200: '#F7F3EC',
          300: '#F0E9DD',
          400: '#E5DACB',
          500: '#D4C4AE',
          600: '#B8A589',
          700: '#96836A',
          800: '#6B5D4D',
          900: '#453D33',
          950: '#2A2520',
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
        // Semantic colors
        surface: {
          DEFAULT: 'var(--surface)',
          elevated: 'var(--surface-elevated)',
          muted: 'var(--surface-muted)',
        },
        // Financial accent colors (subtle)
        positive: {
          DEFAULT: '#3D7A5C',
          light: '#E8F5EE',
          dark: '#2D5A44',
        },
        negative: {
          DEFAULT: '#A65454',
          light: '#FAEDED',
          dark: '#8A4545',
        },
        accent: {
          DEFAULT: '#8B7355',
          light: '#F5F0E8',
          dark: '#6B5540',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Custom scale for financial data density
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.375rem' }],
        lg: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.125rem', { lineHeight: '1.625rem' }],
        '2xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '3xl': ['1.5rem', { lineHeight: '2rem' }],
        '4xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '5xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '0.5': '0.125rem',
        '1.5': '0.375rem',
        '2.5': '0.625rem',
        '3.5': '0.875rem',
        '4.5': '1.125rem',
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      boxShadow: {
        'soft': '0 1px 2px 0 rgba(107, 93, 77, 0.04)',
        'soft-md': '0 2px 4px -1px rgba(107, 93, 77, 0.06), 0 1px 2px -1px rgba(107, 93, 77, 0.04)',
        'soft-lg': '0 4px 6px -2px rgba(107, 93, 77, 0.08), 0 2px 4px -2px rgba(107, 93, 77, 0.04)',
        'soft-xl': '0 8px 16px -4px rgba(107, 93, 77, 0.1), 0 4px 6px -4px rgba(107, 93, 77, 0.06)',
        'inner-soft': 'inset 0 1px 2px 0 rgba(107, 93, 77, 0.06)',
      },
      borderRadius: {
        'sm': '0.25rem',
        DEFAULT: '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'ticker': 'ticker 30s linear infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%, 100%': { backgroundPosition: '200% center' },
          '50%': { backgroundPosition: '0% center' },
        },
      },
      backgroundImage: {
        'gradient-warm': 'linear-gradient(135deg, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 100%)',
        'gradient-subtle': 'linear-gradient(180deg, rgba(251, 249, 245, 0) 0%, rgba(251, 249, 245, 1) 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
