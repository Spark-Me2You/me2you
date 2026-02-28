import React from 'react';

interface GestureAnimationProps {
  gestureName?: string;
}

/**
 * Gesture Animation Component
 * TODO: Implement looping gesture demo
 */
export const GestureAnimation: React.FC<GestureAnimationProps> = ({ gestureName }) => {
  return (
    <div>
      {/* TODO: Implement GestureAnimation */}
      <p>GestureAnimation placeholder</p>
      <p>Demonstrating gesture: {gestureName || 'default'}</p>
    </div>
  );
};
