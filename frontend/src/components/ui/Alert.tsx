import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import './Alert.css';

export type AlertVariant = 'info' | 'warning' | 'error' | 'success';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const variantIcons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle2,
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  action,
  className = '',
}) => {
  const Icon = variantIcons[variant];

  return (
    <div className={`ui-alert ui-alert-${variant} ${className}`} role="alert">
      <Icon className="ui-alert-icon" size={16} aria-hidden="true" />
      <div className="ui-alert-body">
        {title && <div className="ui-alert-title">{title}</div>}
        <div className="ui-alert-message">{children}</div>
      </div>
      {action && <div className="ui-alert-action">{action}</div>}
    </div>
  );
};

export default Alert;
