/**
 * Card Component - AudioFlow Design System
 *
 * @example
 * <Card>
 *   <h3>Título</h3>
 *   <p>Conteúdo do card</p>
 * </Card>
 *
 * <Card variant="elevated" onClick={handleClick}>
 *   Card clicável
 * </Card>
 */

import React from 'react';
import PropTypes from 'prop-types';
import tokens from '../../lib/tokens';

const cardStyles = {
  default: {
    background: tokens.components.card.background,
    border: `1px solid ${tokens.components.card.border}`,
    borderRadius: tokens.components.card.borderRadius,
    padding: tokens.components.card.padding,
    boxShadow: tokens.components.card.shadow,
    transition: 'all 0.2s ease',
    fontFamily: tokens.typography.fontFamily.primary,
  },
  elevated: {
    background: tokens.colors.background.elevated,
    borderRadius: tokens.components.card.borderRadius,
    padding: tokens.components.card.padding,
    boxShadow: tokens.shadows.lg,
    transition: 'all 0.2s ease',
    fontFamily: tokens.typography.fontFamily.primary,
  },
  interactive: {
    background: tokens.components.card.background,
    border: `1px solid ${tokens.components.card.border}`,
    borderRadius: tokens.components.card.borderRadius,
    padding: tokens.components.card.padding,
    boxShadow: tokens.components.card.shadow,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: tokens.typography.fontFamily.primary,
  },
};

export default function Card({
  variant = 'default',
  children,
  onClick,
  className = '',
  style = {},
  ...props
}) {
  const baseStyle = cardStyles[variant] || cardStyles.default;

  const hoverStyle = variant === 'interactive' ? { background: 'rgba(255, 255, 255, 0.05)' } : {};

  const combinedStyle = {
    ...baseStyle,
    ...style,
  };

  return (
    <div
      onClick={onClick}
      className={className}
      style={combinedStyle}
      onMouseEnter={(e) => {
        if (variant === 'interactive') {
          Object.assign(e.target.style, hoverStyle);
        }
      }}
      onMouseLeave={(e) => {
        Object.assign(e.target.style, baseStyle);
      }}
      {...props}
    >
      {children}
    </div>
  );
}

Card.propTypes = {
  variant: PropTypes.oneOf(['default', 'elevated', 'interactive']),
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};
