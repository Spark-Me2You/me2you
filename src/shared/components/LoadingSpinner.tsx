import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

/**
 * Loading Spinner Component
 * TODO: Implement loading state indicator
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'medium' }) => {
  const sizeMap = {
    small: '20px',
    medium: '40px',
    large: '60px',
  };

  return (
    <div
      style={{
        // TODO: Implement proper spinner animation
        width: sizeMap[size],
        height: sizeMap[size],
        border: '3px solid #f3f3f3',
        borderTop: '3px solid #333',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    >
      {/* TODO: Add CSS animation */}
    </div>
  );
};
