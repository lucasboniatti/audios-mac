/**
 * BottomNav Component - AudioFlow Design System
 * Mobile bottom navigation bar
 *
 * @example
 * <BottomNav activeItem="history" onItemClick={handleNavigation}>
 *   <BottomNavItem id="history" label="Histórico" icon="📋" />
 *   <BottomNavItem id="record" isFAB icon="mic" />
 *   <BottomNavItem id="dashboard" label="Dashboard" icon="📊" />
 * </BottomNav>
 */

import React, {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import PropTypes from 'prop-types';
import tokens from '../../lib/tokens';

type BottomNavItemProps = {
  id: string;
  label?: string;
  icon: ReactNode;
  isActive?: boolean;
  onClick: (id: string) => void;
  isFAB?: boolean;
};

type BottomNavProps = HTMLAttributes<HTMLElement> & {
  activeItem?: string;
  onItemClick: (id: string) => void;
  children: ReactNode;
  style?: CSSProperties;
};

const navStyle: CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  background: 'rgba(0, 0, 0, 0.95)',
  backdropFilter: 'blur(10px)',
  borderTop: `1px solid ${tokens.colors.border.subtle}`,
  padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-around',
  zIndex: 50,
  fontFamily: tokens.typography.fontFamily.primary,
};

const navItemStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: tokens.spacing[1],
  color: tokens.colors.text.tertiary,
  cursor: 'pointer',
  transition: 'color 0.2s ease',
  background: 'none',
  border: 'none',
  padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
};

const activeItemStyle: CSSProperties = {
  color: tokens.colors.primary[500],
};

const iconStyle: CSSProperties = {
  fontSize: tokens.typography.fontSize['6xl'],
};

const labelStyle: CSSProperties = {
  fontSize: tokens.typography.fontSize.xs,
  fontWeight: tokens.typography.fontWeight.medium,
};

const fabContainerStyle: CSSProperties = {
  position: 'relative',
  top: `-${tokens.spacing[6]}`,
};

export function BottomNavItem({
  id,
  label,
  icon,
  isActive,
  onClick,
  isFAB = false,
}: BottomNavItemProps) {
  if (isFAB) {
    const fabButtonStyle: CSSProperties = {
      ...navItemStyle,
      width: tokens.spacing[16],
      height: tokens.spacing[16],
      borderRadius: tokens.borderRadius.full,
      background: tokens.colors.primary[500],
      color: '#FFFFFF',
      boxShadow: tokens.shadows.primaryGlow,
      border: `4px solid ${tokens.colors.background.dark}`,
    };

    return (
      <div style={fabContainerStyle}>
        <button
          onClick={() => onClick(id)}
          style={fabButtonStyle}
        >
          <span style={{ fontSize: tokens.typography.fontSize['6xl'] }}>{icon}</span>
        </button>
      </div>
    );
  }

  const combinedStyle: CSSProperties = {
    ...navItemStyle,
    ...(isActive ? activeItemStyle : {}),
  };

  return (
    <button
      onClick={() => onClick(id)}
      style={combinedStyle}
    >
      <span style={iconStyle}>{icon}</span>
      {label && <span style={labelStyle}>{label}</span>}
    </button>
  );
}

BottomNavItem.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  icon: PropTypes.node.isRequired,
  isActive: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  isFAB: PropTypes.bool,
};

export default function BottomNav({
  activeItem,
  onItemClick,
  children,
  className = '',
  style = {},
  ...props
}: BottomNavProps) {
  return (
    <nav
      className={className}
      style={{ ...navStyle, ...style }}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement<BottomNavItemProps>(child)) {
          return React.cloneElement(child, {
            isActive: child.props.id === activeItem,
            onClick: onItemClick,
          });
        }
        return child;
      })}
    </nav>
  );
}

BottomNav.propTypes = {
  activeItem: PropTypes.string,
  onItemClick: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};
