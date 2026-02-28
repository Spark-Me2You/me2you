import React from 'react';

interface CooldownIndicatorProps {
  isOnCooldown: boolean;
  timeRemaining: number;
}

/**
 * Cooldown Indicator Component
 * TODO: Implement 3-5s cooldown UI
 */
export const CooldownIndicator: React.FC<CooldownIndicatorProps> = ({
  isOnCooldown,
  timeRemaining,
}) => {
  if (!isOnCooldown) return null;

  return (
    <div>
      {/* TODO: Implement CooldownIndicator */}
      <p>CooldownIndicator placeholder</p>
      <p>Cooldown: {timeRemaining}s</p>
    </div>
  );
};
