import React from 'react';

interface PhotoPreviewProps {
  photo: string | null;
  onApprove: () => void;
  onRetake: () => void;
}

/**
 * Photo Preview Component
 * TODO: Implement approve/retake interface
 */
export const PhotoPreview: React.FC<PhotoPreviewProps> = ({ photo, onApprove, onRetake }) => {
  if (!photo) return null;

  return (
    <div>
      {/* TODO: Implement PhotoPreview */}
      <p>PhotoPreview placeholder</p>
      <img src={photo} alt="Preview" style={{ maxWidth: '100%' }} />
      <button onClick={onApprove}>Approve</button>
      <button onClick={onRetake}>Retake</button>
    </div>
  );
};
