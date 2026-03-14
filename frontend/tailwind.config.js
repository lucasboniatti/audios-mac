/** @type {import('tailwindcss').Config} */
module.exports = {
  // Using data-theme attribute instead of dark: class
  content: [
    "./*.html",
    "./server.js"
  ],
  theme: {
    extend: {
      colors: {
        // AudioFlow Design Tokens - Primary Brand
        primary: {
          DEFAULT: '#007AFF',
          500: '#007AFF',
          hover: '#0056CC',
          active: '#0044A8',
        },

        // Dark Mode Backgrounds
        background: {
          dark: '#000000',
          surface: '#1C1C1E',
          elevated: '#2C2C2E',
          // Light Mode Backgrounds
          light: '#F9FAFB',
        },

        // Surface Aliases
        surface: {
          dark: '#1C1C1E',
          elevated: '#2C2C2E',
          light: '#FFFFFF',
        },

        // Semantic - Text (Dark Mode)
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',
        'text-disabled': 'var(--color-text-disabled)',
        'text-label': 'var(--color-text-label)',

        // Semantic - Border (Theme-aware)
        'border-subtle': 'var(--color-border-subtle)',
        'border-default': 'var(--color-border-default)',
        'border-strong': 'var(--color-border-strong)',

        // Destructive
        destructive: {
          DEFAULT: '#F43F5E',
          hover: '#E11D48',
          bg: 'rgba(244, 63, 94, 0.10)',
        },

        // Success
        success: {
          DEFAULT: '#10B981',
          hover: '#059669',
          bg: 'rgba(16, 185, 129, 0.10)',
        },

        // Warning
        warning: {
          DEFAULT: '#F59E0B',
          hover: '#D97706',
          bg: 'rgba(245, 158, 11, 0.10)',
        },
      },

      spacing: {
        '14': '56px',
        '16': '64px',
      },

      fontFamily: {
        display: ['Public Sans', 'sans-serif'],
        primary: ['Public Sans', 'sans-serif'],
        secondary: ['Inter', 'sans-serif'],
      },

      fontSize: {
        '2xs': ['9px', { lineHeight: '1.0' }],
        'xs': ['10px', { lineHeight: '1.25' }],
        'sm': ['11px', { lineHeight: '1.25' }],
        'base': ['12px', { lineHeight: '1.25' }],
        'md': ['13px', { lineHeight: '1.25' }],
        'lg': ['14px', { lineHeight: '1.25' }],
        'xl': ['15px', { lineHeight: '1.25' }],
        '2xl': ['16px', { lineHeight: '1.25' }],
        '3xl': ['18px', { lineHeight: '1.25' }],
        '4xl': ['20px', { lineHeight: '1.25' }],
        '5xl': ['24px', { lineHeight: '1.25' }],
        '6xl': ['32px', { lineHeight: '1.0' }],
        '7xl': ['40px', { lineHeight: '1.0' }],
      },

      borderRadius: {
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '32px',
      },

      boxShadow: {
        'primary-glow': '0 0 20px rgba(0, 122, 255, 0.4)',
        'primary-lg': '0 10px 15px -3px rgba(0, 122, 255, 0.3)',
        'card': 'var(--shadow-md)',
        'card-hover': 'var(--shadow-lg)',
      },

      keyframes: {
        slideUp: {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        fadeOut: {
          to: { opacity: "0" },
        },
      },
      animation: {
        slideUp: "slideUp 0.3s ease-out",
        fadeOut: "fadeOut 0.3s ease-in 1.7s forwards",
      },
    },
  },
  plugins: [],
}