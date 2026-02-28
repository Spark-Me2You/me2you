import React from 'react';

interface IdleScreensaverProps {
  isActive: boolean;
}

/**
 * Idle Screensaver Component
 * TODO: Implement art slideshow (30s no presence → screensaver)
 */
export const IdleScreensaver: React.FC<IdleScreensaverProps> = ({ isActive }) => {
  if (!isActive) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
      {/* TODO: Implement IdleScreensaver */}
      <p>IdleScreensaver placeholder</p>
      <p>Art slideshow</p>
    </div>
  );
};
