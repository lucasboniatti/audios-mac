import React from 'react';
import '../frontend/dist/styles.css';
import tokens from '../frontend/lib/tokens';

const h = React.createElement;

/** @type { import('@storybook/react').Preview } */
const preview = {
  globalTypes: {
    theme: {
      description: 'Preview theme',
      defaultValue: 'dark',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'dark', title: 'Dark' },
          { value: 'light', title: 'Light' },
        ],
      },
    },
  },
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true,
      default: 'canvas',
      values: [
        {
          name: 'canvas',
          value: tokens.colors.background.dark,
        },
      ],
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'dark';

      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
      }

      return h(
        'div',
        {
          'data-theme': theme,
          style: {
            backgroundColor: 'var(--color-background)',
            padding: '24px',
            minHeight: '100vh',
            color: 'var(--color-text-primary)',
            fontFamily: tokens.typography.fontFamily.primary,
          },
        },
        h(Story)
      );
    },
  ],
};

export default preview;
