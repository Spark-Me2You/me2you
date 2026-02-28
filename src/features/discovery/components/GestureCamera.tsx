import React from 'react';

interface GestureCameraProps {
  // TODO: Define props
}

/**
 * Gesture Camera Component
 * TODO: Implement live camera feed + overlay
 */
export const GestureCamera: React.FC<GestureCameraProps> = (_props) => {
  return (
    <div>
      {/* TODO: Implement GestureCamera */}
      <p>GestureCamera placeholder</p>
      <video style={{ width: '100%', maxWidth: '640px' }} />
    </div>
  );
};
