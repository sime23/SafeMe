import React, { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      icon: Icon,
      iconPosition = 'left',
      loading = false,
      disabled,
      children,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`ui-btn ui-btn-${variant} ui-btn-${size} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="ui-btn-spinner" aria-hidden="true" />
        ) : Icon && iconPosition === 'left' ? (
          <Icon className="ui-btn-icon" size={size === 'sm' ? 14 : 16} aria-hidden="true" />
        ) : null}

        {children && <span className="ui-btn-label">{children}</span>}

        {!loading && Icon && iconPosition === 'right' && (
          <Icon className="ui-btn-icon" size={size === 'sm' ? 14 : 16} aria-hidden="true" />
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
