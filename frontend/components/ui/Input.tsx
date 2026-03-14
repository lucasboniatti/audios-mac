/**
 * Input Component - AudioFlow Design System
 *
 * @example
 * <Input
 *   label="Nome"
 *   value={name}
 *   onChange={(e) => setName(e.target.value)}
 *   placeholder="Digite seu nome"
 * />
 */

import React, {
  type ChangeEventHandler,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import tokens from '../../lib/tokens';

type InputType = 'text' | 'email' | 'password' | 'number';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'style' | 'type' | 'value'> & {
  label?: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  type?: InputType;
  icon?: ReactNode;
  hint?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  style?: CSSProperties;
};

const inputContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing[1],
  fontFamily: tokens.typography.fontFamily.primary,
};

const labelStyle: CSSProperties = {
  fontSize: tokens.typography.fontSize.xs,
  fontWeight: tokens.typography.fontWeight.bold,
  color: tokens.colors.text.label,
  textTransform: 'uppercase',
  letterSpacing: tokens.typography.letterSpacing.wider,
  paddingLeft: tokens.spacing[1],
};

const inputWrapperStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing[3],
  background: 'rgba(255, 255, 255, 0.05)',
  border: `1px solid ${tokens.colors.border.subtle}`,
  borderRadius: tokens.borderRadius.md,
  padding: tokens.spacing[3],
  transition: 'border-color 0.2s ease',
};

const inputStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: tokens.colors.text.primary,
  fontSize: tokens.typography.fontSize.xs,
  fontWeight: tokens.typography.fontWeight.semibold,
  width: '100%',
  fontFamily: tokens.typography.fontFamily.primary,
};

const iconStyle: CSSProperties = {
  color: 'rgba(255, 255, 255, 0.8)',
  fontSize: tokens.typography.fontSize.lg,
};

const hintStyle: CSSProperties = {
  fontSize: tokens.typography.fontSize['2xs'],
  color: tokens.colors.text.label,
  fontStyle: 'italic',
  paddingLeft: tokens.spacing[1],
};

export default function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon,
  hint,
  disabled = false,
  error = false,
  className = '',
  style = {},
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const focusStyle: CSSProperties = {
    borderColor: tokens.colors.primary[500],
  };

  const errorStyle: CSSProperties = {
    borderColor: tokens.colors.destructive.default,
  };

  const disabledStyle: CSSProperties = {
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  const combinedWrapperStyle: CSSProperties = {
    ...inputWrapperStyle,
    ...(isFocused ? focusStyle : {}),
    ...(error ? errorStyle : {}),
    ...(disabled ? disabledStyle : {}),
  };

  return (
    <div style={{ ...inputContainerStyle, ...style }} className={className}>
      {label && <label style={labelStyle}>{label}</label>}

      <div style={combinedWrapperStyle}>
        {icon && <span style={iconStyle}>{icon}</span>}

        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          style={inputStyle}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </div>

      {hint && <span style={hintStyle}>{hint}</span>}
    </div>
  );
}

Input.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  type: PropTypes.oneOf(['text', 'email', 'password', 'number']),
  icon: PropTypes.node,
  hint: PropTypes.string,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};
