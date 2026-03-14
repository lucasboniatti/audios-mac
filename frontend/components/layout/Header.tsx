/**
 * Header Component - AudioFlow Design System
 * Mobile app header with logo, title, and actions
 *
 * @example
 * <Header title="ÁudioFlow" showBackButton onBackClick={handleBack}>
 *   <Avatar src="photo.jpg" size="sm" />
 * </Header>
 */

import React, {
  type CSSProperties,
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
import PropTypes from 'prop-types';
import tokens from '../../lib/tokens';

type HeaderProps = HTMLAttributes<HTMLElement> & {
  title?: string;
  showBackButton?: boolean;
  onBackClick?: MouseEventHandler<HTMLButtonElement>;
  children?: ReactNode;
  style?: CSSProperties;
};

const headerStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 50,
  background: tokens.colors.background.dark,
  borderBottom: `1px solid ${tokens.colors.border.subtle}`,
  padding: tokens.spacing[4],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontFamily: tokens.typography.fontFamily.primary,
};

const leftSectionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing[2],
};

const logoStyle: CSSProperties = {
  width: tokens.spacing[10],
  height: tokens.spacing[10],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: tokens.colors.primary[500],
  fontSize: tokens.typography.fontSize['4xl'],
};

const titleStyle: CSSProperties = {
  fontSize: tokens.typography.fontSize['2xl'],
  fontWeight: tokens.typography.fontWeight.bold,
  letterSpacing: tokens.typography.letterSpacing.tight,
  color: tokens.colors.text.primary,
  margin: 0,
};

const backButtonStyle: CSSProperties = {
  width: tokens.spacing[8],
  height: tokens.spacing[8],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255, 255, 255, 0.8)',
  cursor: 'pointer',
  borderRadius: tokens.borderRadius.full,
  transition: 'background 0.2s ease',
  background: 'transparent',
  border: 'none',
  fontSize: tokens.typography.fontSize.xl,
};

const rightSectionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing[4],
};

export default function Header({
  title = 'ÁudioFlow',
  showBackButton = false,
  onBackClick,
  children,
  className = '',
  style = {},
  ...props
}: HeaderProps) {
  return (
    <header
      className={className}
      style={{ ...headerStyle, ...style }}
      {...props}
    >
      <div style={leftSectionStyle}>
        {showBackButton && (
          <button
            onClick={onBackClick}
            style={backButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ←
          </button>
        )}

        <div style={logoStyle}>
          <span role="img" aria-label="AudioFlow Logo">🔊</span>
        </div>

        <h1 style={titleStyle}>{title}</h1>
      </div>

      <div style={rightSectionStyle}>
        {children}
      </div>
    </header>
  );
}

Header.propTypes = {
  title: PropTypes.string,
  showBackButton: PropTypes.bool,
  onBackClick: PropTypes.func,
  children: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.object,
};
