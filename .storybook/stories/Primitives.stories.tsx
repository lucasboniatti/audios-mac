import React from 'react';
import { Avatar, Chip, FAB, Input } from '../../frontend/components';
import tokens from '../../frontend/lib/tokens';

const h = React.createElement;

function InputPlayground() {
  const [value, setValue] = React.useState('');

  return h(
    'div',
    { style: { display: 'grid', gap: '20px', maxWidth: '360px' } },
    h(Input, {
      label: 'Busca',
      value,
      onChange: (event) => setValue(event.target.value),
      placeholder: 'Digite para testar o estado focado',
      icon: '⌘',
      hint: 'Input ligado aos tokens de foco, label e hint',
    }),
    h(Input, {
      label: 'Campo com erro',
      value: 'Token drift',
      onChange: () => {},
      error: true,
      hint: 'Exemplo de estado destrutivo',
    })
  );
}

export default {
  title: 'UI/Primitives',
  tags: ['autodocs'],
};

export const Inputs = {
  render: () => h(InputPlayground),
};

export const Chips = {
  render: () => h(
    'div',
    { style: { display: 'flex', flexWrap: 'wrap', gap: '16px' } },
    h(Chip, { count: '1,240x' }, 'Inovação'),
    h(Chip, { count: '982x' }, 'Estratégia'),
    h(Chip, { variant: 'filter', selected: true }, 'Hoje'),
    h(Chip, { variant: 'filter' }, 'Este mês')
  ),
};

export const AvatarsAndFab = {
  render: () => h(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: '24px' } },
    h(Avatar, { size: 'sm', style: { background: tokens.colors.background.elevated } }),
    h(Avatar, { size: 'md', style: { background: tokens.colors.background.elevated } }),
    h(
      Avatar,
      { size: 'lg', showEditButton: true, style: { background: tokens.colors.background.elevated } },
      h(
        'div',
        {
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tokens.colors.text.secondary,
            fontWeight: tokens.typography.fontWeight.bold,
          },
        },
        'AF'
      )
    ),
    h(FAB, null, '🎤')
  ),
};
