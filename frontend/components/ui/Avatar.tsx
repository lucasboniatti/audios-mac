/**
 * Avatar Component - AudioFlow Design System
 *
 * @example
 * <Avatar src="photo.jpg" alt="User name" size="md" />
 *
 * <Avatar size="lg" showEditButton onEditClick={handleEdit}>
 *   <img src="photo.jpg" alt="User" />
 * </Avatar>
 */

import React, {
  type CSSProperties,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
import PropTypes from 'prop-types';
import tokens from '../../lib/tokens';

type AvatarSize = 'sm' | 'md' | 'lg';

type AvatarProps = HTMLAttributes<HTMLDivElement> &
  ImgHTMLAttributes<HTMLImageElement> & {
    src?: string;
    alt?: string;
    size?: AvatarSize;
    showEditButton?: boolean;
    onEditClick?: MouseEventHandler<HTMLButtonElement>;
    children?: ReactNode;
    style?: CSSProperties;
  };

const avatarSizes: Record<AvatarSize, string> = {
  sm: tokens.components.avatar.sm,
  md: tokens.components.avatar.md,
  lg: tokens.components.avatar.lg,
};

const avatarStyle: CSSProperties = {
  borderRadius: tokens.borderRadius.full,
  objectFit: 'cover',
  border: `2px solid rgba(0, 122, 255, 0.2)`,
};

const containerStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-block',
};

const editButtonStyle: CSSProperties = {
  position: 'absolute',
  bottom: '0',
  right: '0',
  background: tokens.colors.primary[500],
  color: '#FFFFFF',
  borderRadius: tokens.borderRadius.full,
  padding: tokens.spacing[1],
  border: `2px solid ${tokens.colors.background.dark}`,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: tokens.shadows.sm,
};

export default function Avatar({
  src,
  alt = 'Avatar',
  size = 'md',
  showEditButton = false,
  onEditClick,
  children,
  className = '',
  style = {},
  ...props
}: AvatarProps) {
  const sizeValue = avatarSizes[size] || avatarSizes.md;

  const combinedStyle: CSSProperties = {
    width: sizeValue,
    height: sizeValue,
    ...avatarStyle,
    ...style,
  };

  if (children) {
    return (
      <div style={containerStyle} className={className}>
        <div style={combinedStyle} {...props}>
          {children}
        </div>
        {showEditButton && (
          <button onClick={onEditClick} style={editButtonStyle}>
            <span style={{ fontSize: '14px' }}>📷</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={containerStyle} className={className}>
      <img
        src={src}
        alt={alt}
        style={combinedStyle}
        {...props}
      />
      {showEditButton && (
        <button onClick={onEditClick} style={editButtonStyle}>
          <span style={{ fontSize: '14px' }}>📷</span>
        </button>
      )}
    </div>
  );
}

Avatar.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showEditButton: PropTypes.bool,
  onEditClick: PropTypes.func,
  children: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.object,
};
