/**
 * Card Component Stories
 * Demonstrates all card variants from AudioFlow Design System
 */

import React from 'react';
import Card from '../../frontend/components/ui/Card';
import tokens from '../../frontend/lib/tokens';

const h = React.createElement;

function cardContent(title, body) {
  return h(
    'div',
    null,
    h('h3', { style: { margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' } }, title),
    h('p', { style: { margin: 0, fontSize: '14px', color: tokens.colors.text.secondary } }, body)
  );
}

export default {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onClick: {
      action: 'clicked',
    },
  },
};

export const Default = {
  args: {
    variant: 'default',
    children: cardContent('Título do Card', 'Conteúdo do card com texto secundário'),
  },
};

export const Elevated = {
  args: {
    variant: 'elevated',
    children: cardContent('Card Elevado', 'Este card tem uma sombra mais forte'),
  },
};

export const Interactive = {
  args: {
    variant: 'interactive',
    children: cardContent('Card Clicável', 'Hover para ver o efeito'),
  },
};

export const AllVariants = {
  render: () => h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: '20px', width: '320px' } },
    h(Card, { variant: 'default' }, cardContent('Default Card', 'Standard card')),
    h(Card, { variant: 'elevated' }, cardContent('Elevated Card', 'More shadow')),
    h(Card, { variant: 'interactive' }, cardContent('Interactive Card', 'Click me'))
  ),
};
