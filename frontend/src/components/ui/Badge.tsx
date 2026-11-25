import React from 'react';
import './Badge.css';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  dot = false,
  pulse = false,
  children,
  className = '',
  ...props
}) => {
  return (
    <span className={`ui-badge ui-badge-${variant} ${className}`} {...props}>
      {dot && (
        <span
          className={`ui-badge-dot ${pulse ? 'ui-badge-dot-pulse' : ''}`}
          aria-hidden="true"
        />
      )}
      <span className="ui-badge-text">{children}</span>
    </span>
  );
};

export default Badge;
