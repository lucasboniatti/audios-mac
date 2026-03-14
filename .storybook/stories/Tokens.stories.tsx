/**
 * Design Tokens Stories
 * Visual documentation of all design tokens
 */

import React from 'react';
import tokens from '../../frontend/lib/tokens';

const h = React.createElement;

export default {
  title: 'Design System/Tokens',
  tags: ['autodocs'],
};

export const Colors = {
  render: () => h(
    'div',
    { style: { display: 'grid', gap: '24px' } },
    h(
      'div',
      null,
      h('h2', { style: { margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600' } }, 'Primary'),
      h(
        'div',
        { style: { display: 'flex', gap: '12px' } },
        h(
          'div',
          { style: { width: '80px', textAlign: 'center' } },
          h('div', {
            style: {
              width: '80px',
              height: '80px',
              background: tokens.colors.primary[500],
              borderRadius: '12px',
            },
          }),
          h('p', { style: { margin: '8px 0 0 0', fontSize: '12px' } }, '#007AFF')
        )
      )
    ),
    h(
      'div',
      null,
      h('h2', { style: { margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600' } }, 'Backgrounds'),
      h(
        'div',
        { style: { display: 'flex', gap: '12px' } },
        ...Object.entries(tokens.colors.background).map(([key, value]) =>
          h(
            'div',
            { key, style: { width: '80px', textAlign: 'center' } },
            h('div', {
              style: {
                width: '80px',
                height: '80px',
                background: value,
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
              },
            }),
            h('p', { style: { margin: '8px 0 0 0', fontSize: '12px' } }, key),
            h('p', { style: { margin: '4px 0 0 0', fontSize: '10px', color: 'rgba(255,255,255,0.6)' } }, value)
          )
        )
      )
    ),
    h(
      'div',
      null,
      h('h2', { style: { margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600' } }, 'Semantic Colors'),
      h(
        'div',
        { style: { display: 'flex', gap: '12px', flexWrap: 'wrap' } },
        ...[
          ['destructive', tokens.colors.destructive.default],
          ['destructive background', tokens.colors.destructive.background],
          ['text primary', tokens.colors.text.primary],
          ['text secondary', tokens.colors.text.secondary],
          ['border subtle', tokens.colors.border.subtle],
        ].map(([key, value]) =>
          h(
            'div',
            { key, style: { width: '80px', textAlign: 'center' } },
            h('div', {
              style: {
                width: '80px',
                height: '80px',
                background: value,
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
              },
            }),
            h('p', { style: { margin: '8px 0 0 0', fontSize: '12px' } }, key),
            h('p', { style: { margin: '4px 0 0 0', fontSize: '10px', color: 'rgba(255,255,255,0.6)' } }, value)
          )
        )
      )
    )
  ),
};

export const Typography = {
  render: () => h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
    h('h2', { style: { margin: 0, fontSize: '18px' } }, 'Font Sizes'),
    ...Object.entries(tokens.typography.fontSize).map(([key, value]) =>
      h(
        'div',
        { key, style: { display: 'flex', alignItems: 'baseline', gap: '20px' } },
        h('span', { style: { width: '60px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' } }, key),
        h('span', { style: { fontSize: value } }, `${value} - The quick brown fox`)
      )
    )
  ),
};

export const Spacing = {
  render: () => h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
    h('h2', { style: { margin: 0, fontSize: '18px' } }, 'Spacing Scale (4px base)'),
    ...Object.entries(tokens.spacing).map(([key, value]) =>
      h(
        'div',
        { key, style: { display: 'flex', alignItems: 'center', gap: '20px' } },
        h('span', { style: { width: '40px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' } }, key),
        h('div', {
          style: {
            width: parseInt(value, 10),
            height: '20px',
            background: '#007AFF',
            borderRadius: '4px',
          },
        }),
        h('span', { style: { fontSize: '12px', color: 'rgba(255,255,255,0.8)' } }, value)
      )
    )
  ),
};

export const BorderRadius = {
  render: () => h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
    h('h2', { style: { margin: 0, fontSize: '18px' } }, 'Border Radius'),
    h(
      'div',
      { style: { display: 'flex', flexWrap: 'wrap', gap: '16px' } },
      ...Object.entries(tokens.borderRadius).map(([key, value]) =>
        h(
          'div',
          { key, style: { textAlign: 'center' } },
          h('div', {
            style: {
              width: '60px',
              height: '60px',
              background: '#1C1C1E',
              border: '2px solid #007AFF',
              borderRadius: value,
            },
          }),
          h('p', { style: { margin: '8px 0 0 0', fontSize: '12px' } }, key),
          h('p', { style: { margin: '4px 0 0 0', fontSize: '10px', color: 'rgba(255,255,255,0.6)' } }, value)
        )
      )
    )
  ),
};

export const Shadows = {
  render: () => h(
    'div',
    { style: { display: 'grid', gap: '16px', maxWidth: '420px' } },
    ...['sm', 'default', 'md', 'lg', 'primaryGlow', 'primaryLg'].map((key) =>
      h(
        'div',
        {
          key,
          style: {
            padding: '20px',
            borderRadius: tokens.borderRadius.xl,
            background: tokens.colors.background.surface,
            boxShadow: tokens.shadows[key],
          },
        },
        h('strong', { style: { display: 'block', marginBottom: '8px' } }, key),
        h('span', { style: { color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm } }, tokens.shadows[key])
      )
    )
  ),
};
