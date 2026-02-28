import React from 'react';

interface PresenceIndicatorProps {
  isPresent: boolean;
}

/**
 * Presence Indicator Component
 * TODO: Implement "System active" glow
 */
export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({ isPresent }) => {
  return (
    <div
      style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: isPresent ? '#0f0' : '#f00',
      }}
    >
      {/* TODO: Implement PresenceIndicator with glow effect */}
    </div>
  );
};
