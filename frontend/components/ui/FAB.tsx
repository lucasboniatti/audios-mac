/**
 * FAB (Floating Action Button) Component - AudioFlow Design System
 * Special button with glow effect for primary actions
 *
 * @example
 * <FAB onClick={handleRecord}>
 *   <span style={{ fontSize: '32px' }}>mic</span>
 * </FAB>
 */

import React, {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import PropTypes from 'prop-types';
import tokens from '../../lib/tokens';

type FABProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  style?: CSSProperties;
};

const fabStyle: CSSProperties = {
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
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  ...props
}: FABProps) {
  const disabledStyle: CSSProperties = {
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  const combinedStyle: CSSProperties = {
    ...fabStyle,
    ...(disabled ? disabledStyle : {}),
    ...style,
  };

  const defaultTransform = typeof combinedStyle.transform === 'string'
    ? combinedStyle.transform
    : 'scale(1)';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={combinedStyle}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(1.05)';
        }
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = defaultTransform;
        onMouseLeave?.(e);
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(0.95)';
        }
        onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(1.05)';
        }
        onMouseUp?.(e);
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
