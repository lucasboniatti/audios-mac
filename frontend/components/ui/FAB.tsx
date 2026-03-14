/**
 * FAB (Floating Action Button) Component - AudioFlow Design System
 * Special button with glow effect for primary actions
 *
 * @example
 * <FAB onClick={handleRecord}>
 *   <span style={{ fontSize: '32px' }}>mic</span>
 * </FAB>
 */

import React from 'react';
import PropTypes from 'prop-types';
import tokens from '../../lib/tokens';

const fabStyle = {
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
  outline: 'none',
  fontFamily: tokens.typography.fontFamily.primary,
};

export default function FAB({
  children,
  onClick,
  disabled = false,
  className = '',
  style = {},
  ...props
}) {
  const disabledStyle = {
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  const combinedStyle = {
    ...fabStyle,
    ...(disabled ? disabledStyle : {}),
    ...style,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={combinedStyle}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.target.style.transform = 'scale(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'scale(1)';
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.target.style.transform = 'scale(0.95)';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.target.style.transform = 'scale(1.05)';
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}

FAB.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};
