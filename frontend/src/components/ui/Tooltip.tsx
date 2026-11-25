import React, { useState } from 'react';
import './Tooltip.css';

export interface TooltipProps {
  content: React.ReactNode;
  position?: 'top' | 'bottom';
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="ui-tooltip-wrapper"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && (
        <div className={`ui-tooltip-bubble ui-tooltip-${position}`} role="tooltip">
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
