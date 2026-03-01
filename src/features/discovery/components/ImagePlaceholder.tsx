import React from 'react';

/**
 * ImagePlaceholder Component
 * Placeholder for the right side of the discovery view
 * Future: Will display matched profile images or gesture comparison results
 */
export const ImagePlaceholder: React.FC = () => {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px dashed #ccc',
        borderRadius: '8px',
        backgroundColor: '#f5f5f5',
        padding: '2rem',
      }}
    >
      <div style={{ textAlign: 'center', color: '#666' }}>
        <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
          Image Placeholder
        </p>
        <p style={{ fontSize: '0.875rem', color: '#999' }}>
          Gesture matching results will appear here
        </p>
        {/* TODO: Add image element for displaying matched profile or gesture comparison */}
        {/* <img src={imageSrc} alt="Matched profile" /> */}
      </div>
    </div>
  );
};
