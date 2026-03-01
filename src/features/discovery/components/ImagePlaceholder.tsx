import React from 'react';
import type { GestureRecognitionResult } from '../hooks/useGestureRecognition';

/**
 * ImagePlaceholder Component Props
 */
interface ImagePlaceholderProps {
  detectedGesture?: GestureRecognitionResult | null;
}

/**
 * ImagePlaceholder Component
 * Displays detected gesture emoji or instructional text
 * Right side of the discovery split-screen layout
 */
export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({
  detectedGesture,
}) => {
  // Check if peace sign (Victory gesture) is detected
  const isPeaceSignDetected = detectedGesture?.gestureName === 'Victory';
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
      {isPeaceSignDetected ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '8rem', lineHeight: 1 }}>✌️</div>
          {detectedGesture.handedness && (
            <p
              style={{
                fontSize: '1rem',
                marginTop: '1rem',
                color: '#666',
              }}
            >
              {detectedGesture.handedness} hand •{' '}
              {Math.round((detectedGesture.confidence || 0) * 100)}% confidence
            </p>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#666' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
            Show a peace sign! ✌️
          </p>
          <p style={{ fontSize: '0.875rem', color: '#999' }}>
            The emoji will appear when you make the gesture
          </p>
        </div>
      )}
    </div>
  );
};
