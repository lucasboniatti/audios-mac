const designTokensConfig = require('../design-tokens/tokens.tailwind.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...designTokensConfig,
  content: [
    './*.html',
    './server.js',
  ],
  theme: {
    ...(designTokensConfig.theme || {}),
    extend: {
      ...(designTokensConfig.theme?.extend || {}),
      fontFamily: {
        ...(designTokensConfig.theme?.extend?.fontFamily || {}),
        display: designTokensConfig.theme?.extend?.fontFamily?.primary || ['Public Sans', 'sans-serif'],
      },
      boxShadow: {
        ...(designTokensConfig.theme?.extend?.boxShadow || {}),
        card: 'var(--shadow-md)',
        'card-hover': 'var(--shadow-lg)',
      },
      keyframes: {
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeOut: {
          to: { opacity: '0' },
        },
      },
      animation: {
        slideUp: 'slideUp 0.3s ease-out',
        fadeOut: 'fadeOut 0.3s ease-in 1.7s forwards',
      },
    },
  },
};
