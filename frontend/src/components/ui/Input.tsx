import React, { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import './Input.css';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  icon?: LucideIcon;
  size?: 'sm' | 'md';
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon: Icon, size = 'md', onClear, value, className = '', ...props }, ref) => {
    const hasValue = value !== undefined && value !== null && String(value).length > 0;

    return (
      <div className={`ui-input-wrapper ui-input-${size} ${className}`}>
        {Icon && <Icon className="ui-input-icon" size={size === 'sm' ? 14 : 16} aria-hidden="true" />}
        <input ref={ref} value={value} className="ui-input-field" {...props} />
        {onClear && hasValue && (
          <button
            type="button"
            className="ui-input-clear-btn"
            onClick={onClear}
            title="Clear input"
            aria-label="Clear input"
          >
            <X size={13} />
          </button>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
