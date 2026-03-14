/**
 * Chip Component - AudioFlow Design System
 *
 * @example
 * <Chip>Inovação <span>1,240x</span></Chip>
 *
 * <Chip variant="filter" selected={isActive} onClick={handleToggle}>
 *   Hoje
 * </Chip>
 */

import React from 'react';
import PropTypes from 'prop-types';
import tokens from '../../lib/tokens';

const chipStyles = {
  default: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing[2],
    background: tokens.components.chip.background,
    color: tokens.components.chip.color,
    padding: `${tokens.components.chip.paddingY} ${tokens.components.chip.paddingX}`,
    borderRadius: tokens.components.chip.borderRadius,
    fontSize: tokens.components.chip.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    border: `1px solid ${tokens.colors.border.subtle}`,
    boxShadow: tokens.shadows.sm,
    fontFamily: tokens.typography.fontFamily.primary,
  },
  filter: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing[2],
    background: tokens.colors.background.surface,
    color: tokens.colors.text.tertiary,
    padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
    borderRadius: tokens.borderRadius.lg,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: tokens.typography.fontFamily.primary,
  },
  selected: {
    background: tokens.colors.primary[500],
    color: '#FFFFFF',
  },
};

export default function Chip({
  variant = 'default',
  selected = false,
  children,
  onClick,
  count,
  className = '',
  style = {},
  ...props
}) {
  const baseStyle = chipStyles[variant] || chipStyles.default;

  const combinedStyle = {
    ...baseStyle,
    ...(variant === 'filter' && selected ? chipStyles.selected : {}),
    ...(onClick ? { cursor: 'pointer' } : {}),
    ...style,
  };

  return (
    <div
      onClick={onClick}
      className={className}
      style={combinedStyle}
      {...props}
    >
      {children}
      {count && (
        <span
          style={{
            background: tokens.colors.background.elevated,
            padding: `${tokens.spacing[0]} ${tokens.spacing[2]}`,
            borderRadius: tokens.borderRadius.full,
            fontSize: tokens.typography.fontSize.xs,
            fontWeight: tokens.typography.fontWeight.bold,
            color: tokens.colors.primary[500],
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

Chip.propTypes = {
  variant: PropTypes.oneOf(['default', 'filter']),
  selected: PropTypes.bool,
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  count: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
};
