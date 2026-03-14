import React from 'react';

interface SessionTimeoutWarningProps {
  timeRemaining: number;
  onExtend?: () => void;
}

/**
 * Session Timeout Warning Component
 * TODO: Implement 90s inactivity timeout warning
 */
export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  timeRemaining,
  onExtend,
}) => {
  return (
    <div>
      {/* TODO: Implement SessionTimeoutWarning */}
      <p>Session Timeout Warning placeholder</p>
      <p>Time remaining: {timeRemaining}s</p>
      {onExtend && <button onClick={onExtend}>Extend Session</button>}
    </div>
  );
};
