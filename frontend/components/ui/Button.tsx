/**
 * Button Component - AudioFlow Design System
 *
 * @example
 * // Primary button
 * <Button variant="primary" onClick={handleClick}>
 *   Salvar Alterações
 * </Button>
 *
 * // FAB button
 * <Button variant="fab" onClick={handleRecord}>
 *   <MicIcon />
 * </Button>
 */

import React from 'react';
import PropTypes from 'prop-types';
import tokens from '../../lib/tokens';

const buttonStyles = {
  primary: {
    background: tokens.colors.primary[500],
    color: '#FFFFFF',
    padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
    borderRadius: tokens.borderRadius.lg,
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.bold,
    boxShadow: tokens.shadows.primaryLg,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: tokens.typography.fontFamily.primary,
  },
  secondary: {
    background: tokens.colors.background.elevated,
    color: tokens.colors.text.primary,
    padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
    borderRadius: tokens.borderRadius.lg,
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.bold,
    border: `1px solid ${tokens.colors.border.subtle}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: tokens.typography.fontFamily.primary,
  },
  destructive: {
    background: 'transparent',
    color: tokens.colors.destructive.default,
    padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
    borderRadius: tokens.borderRadius.lg,
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.bold,
    border: `2px solid ${tokens.colors.border.strong}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: tokens.typography.fontFamily.primary,
  },
  fab: {
    width: tokens.components.button.fab.width,
    height: tokens.components.button.fab.height,
    borderRadius: tokens.components.button.fab.borderRadius,
    background: tokens.colors.primary[500],
    color: '#FFFFFF',
    boxShadow: tokens.components.button.fab.shadow,
    border: `4px solid ${tokens.colors.background.dark}`,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s ease',
    fontFamily: tokens.typography.fontFamily.primary,
  },
};

export default function Button({
  variant = 'primary',
  children,
  onClick,
  disabled = false,
  type = 'button',
  className = '',
  style = {},
  ...props
}) {
  const baseStyle = buttonStyles[variant] || buttonStyles.primary;

  const hoverStyles = {
    primary: { background: tokens.colors.primary.hover },
    secondary: { background: 'rgba(255, 255, 255, 0.1)' },
    destructive: { background: tokens.colors.destructive.background },
    fab: { transform: 'scale(1.05)' },
  };

  const disabledStyle = {
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  const combinedStyle = {
    ...baseStyle,
    ...(disabled ? disabledStyle : {}),
    ...style,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={combinedStyle}
      onMouseEnter={(e) => {
        if (!disabled && hoverStyles[variant]) {
          Object.assign(e.target.style, hoverStyles[variant]);
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          Object.assign(e.target.style, baseStyle);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}

// PropTypes
Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'destructive', 'fab']),
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  className: PropTypes.string,
  style: PropTypes.object,
};
