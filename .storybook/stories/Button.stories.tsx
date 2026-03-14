/**
 * Button Component Stories
 * Demonstrates all button variants from AudioFlow Design System
 */

import React from 'react';
import Button from '../../frontend/components/ui/Button';

const h = React.createElement;

export default {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'destructive', 'fab'],
    },
    disabled: {
      control: 'boolean',
    },
    children: {
      control: 'text',
    },
    onClick: {
      action: 'clicked',
    },
  },
};

export const Primary = {
  args: {
    variant: 'primary',
    children: 'Salvar Alterações',
  },
};

export const Secondary = {
  args: {
    variant: 'secondary',
    children: 'Cancelar',
  },
};

export const Destructive = {
  args: {
    variant: 'destructive',
    children: 'Sair',
  },
};

export const FAB = {
  args: {
    variant: 'fab',
    children: '🎤',
  },
};

export const AllVariants = {
  render: () => h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' } },
    h(Button, { variant: 'primary' }, 'Primary Button'),
    h(Button, { variant: 'secondary' }, 'Secondary Button'),
    h(Button, { variant: 'destructive' }, 'Destructive Button'),
    h(Button, { variant: 'fab' }, '🎤')
  ),
};

export const Disabled = {
  render: () => h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' } },
    h(Button, { variant: 'primary', disabled: true }, 'Disabled Primary'),
    h(Button, { variant: 'secondary', disabled: true }, 'Disabled Secondary'),
    h(Button, { variant: 'fab', disabled: true }, '🎤')
  ),
};
