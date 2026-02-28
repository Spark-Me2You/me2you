import React from 'react';

interface PhotoCaptureProps {
  onCapture: (photo: Blob) => void;
}

/**
 * Photo Capture Component
 * TODO: Implement camera + gesture capture
 */
export const PhotoCapture: React.FC<PhotoCaptureProps> = ({ onCapture: _onCapture }) => {
  return (
    <div>
      {/* TODO: Implement PhotoCapture */}
      <p>PhotoCapture placeholder</p>
      <video style={{ width: '100%', maxWidth: '640px' }} />
      <button onClick={() => {}}>Capture Photo</button>
    </div>
  );
};
