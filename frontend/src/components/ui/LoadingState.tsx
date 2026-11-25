import React from 'react';
import './LoadingState.css';

export interface LoadingStateProps {
  message?: string;
  minHeight?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading telemetry...',
  minHeight = '320px',
}) => {
  return (
    <div className="ui-loading-state" style={{ minHeight }}>
      <div className="ui-loading-spinner" aria-hidden="true" />
      <span className="ui-loading-message">{message}</span>
    </div>
  );
};

export default LoadingState;
