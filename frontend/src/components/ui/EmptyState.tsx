import React from 'react';
import type { LucideIcon } from 'lucide-react';
import './EmptyState.css';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`ui-empty-state ${className}`}>
      {Icon && (
        <div className="ui-empty-state-icon">
          <Icon size={28} strokeWidth={1.5} />
        </div>
      )}
      <div className="ui-empty-state-title">{title}</div>
      {description && <p className="ui-empty-state-description">{description}</p>}
      {action && <div className="ui-empty-state-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
