import React from 'react';
import brandAssets, { brandMetadata } from '../../frontend/lib/brand-assets';
import tokens from '../../frontend/lib/tokens';

const h = React.createElement;

function brandCard(title: string, assetPath: string, notes: string) {
  return h(
    'div',
    {
      style: {
        display: 'grid',
        gap: '12px',
        padding: '20px',
        borderRadius: tokens.borderRadius.xl,
        background: tokens.colors.background.surface,
        border: `1px solid ${tokens.colors.border.subtle}`,
        maxWidth: '240px',
      },
    },
    h('strong', null, title),
    h(
      'div',
      {
        style: {
          minHeight: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          borderRadius: tokens.borderRadius.lg,
          background: '#FFFFFF',
        },
      },
      h('img', {
        src: assetPath,
        alt: title,
        style: { maxWidth: '120px', maxHeight: '80px' },
      })
    ),
    h('code', { style: { fontSize: tokens.typography.fontSize.xs } }, assetPath),
    h('span', { style: { color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm } }, notes)
  );
}

export default {
  title: 'Design System/Brand Assets',
  tags: ['autodocs'],
};

export const Logos = {
  render: () => h(
    'div',
    { style: { display: 'grid', gap: '24px' } },
    h(
      'div',
      { style: { maxWidth: '720px' } },
      h('h2', { style: { margin: '0 0 8px 0', fontSize: '18px' } }, 'Shared brand assets'),
      h(
        'p',
        { style: { margin: 0, color: tokens.colors.text.secondary } },
        `Source of truth: ${brandMetadata.assetSourceOfTruth}. Web surfaces consume these files from /shared-assets/* without forcing a rewrite of the current companion.`
      )
    ),
    h(
      'div',
      { style: { display: 'flex', flexWrap: 'wrap', gap: '20px' } },
      brandCard('Primary logo', brandAssets.logos.primary, brandMetadata.usage.primaryLogo),
      brandCard('Transparent logo', brandAssets.logos.transparent, brandMetadata.usage.transparentLogo),
      brandCard('White background logo', brandAssets.logos.whiteBackground, 'Useful when exporting or previewing against dark surfaces.')
    )
  ),
};
