import React from 'react';

interface HowToOverlayProps {
  isOpen: boolean;
  onDismiss: () => void;
}

/**
 * How To Overlay Component
 * TODO: Implement tutorial overlay
 */
export const HowToOverlay: React.FC<HowToOverlayProps> = ({ isOpen, onDismiss }) => {
  if (!isOpen) return null;

  return (
    <div>
      {/* TODO: Implement HowToOverlay */}
      <p>HowToOverlay placeholder</p>
      <p>Tutorial instructions</p>
      <button onClick={onDismiss}>Got it!</button>
    </div>
  );
};
