import React from 'react';
import type { GestureRecognitionResult } from '../hooks/useGestureRecognition';
import type { RandomImageData } from '../types/image';

/**
 * ImagePlaceholder Component Props
 */
interface ImagePlaceholderProps {
  detectedGesture?: GestureRecognitionResult | null;
  imageData?: RandomImageData | null;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * ImagePlaceholder Component
 * Displays random public image with user info when peace sign is detected
 * Right side of the discovery split-screen layout
 *
 * States:
 * 1. Default - Show instructions to make peace sign
 * 2. Loading - Show loading message while fetching image
 * 3. Error - Show error message if fetch fails
 * 4. Success - Display image with owner's display name and bio
 */
export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({
  detectedGesture,
  imageData,
  isLoading,
  error,
}) => {
  // Check if peace sign (Victory gesture) is detected
  const isPeaceSignDetected = detectedGesture?.gestureName === 'Victory';

  // State 1: Loading image
  if (isPeaceSignDetected && isLoading) {
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
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.2rem', color: '#666' }}>Loading image...</p>
        </div>
      </div>
    );
  }

  // State 2: Error occurred
  if (isPeaceSignDetected && error) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed #ccc',
          borderRadius: '8px',
          backgroundColor: '#fff3cd',
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontSize: '1.2rem',
              color: '#856404',
              marginBottom: '0.5rem',
            }}
          >
            {error}
          </p>
          <p style={{ fontSize: '0.875rem', color: '#856404' }}>
            Try showing the peace sign again
          </p>
        </div>
      </div>
    );
  }

  // State 3: Image loaded successfully
  if (isPeaceSignDetected && imageData) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: '2px solid #4caf50',
          borderRadius: '8px',
          backgroundColor: '#fff',
          padding: '1.5rem',
          overflow: 'hidden',
        }}
      >
        {/* Image container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            overflow: 'hidden',
            borderRadius: '4px',
            backgroundColor: '#f5f5f5',
          }}
        >
          <img
            src={imageData.imageUrl}
            alt={`Photo by ${imageData.owner.display_name}`}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
            onError={(e) => {
              // Fallback if image fails to load
              console.error(
                '[ImagePlaceholder] Failed to load image:',
                imageData.imageUrl
              );
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* User info */}
        <div
          style={{
            borderTop: '1px solid #e0e0e0',
            paddingTop: '1rem',
          }}
        >
          <h3
            style={{
              margin: '0 0 0.5rem 0',
              fontSize: '1.5rem',
              color: '#333',
            }}
          >
            {imageData.owner.display_name}
          </h3>
          {imageData.owner.bio && (
            <p
              style={{
                margin: 0,
                fontSize: '1rem',
                color: '#666',
                lineHeight: 1.5,
              }}
            >
              {imageData.owner.bio}
            </p>
          )}
        </div>

        {/* Gesture info (optional, for debugging) */}
        {detectedGesture?.handedness && (
          <p
            style={{
              fontSize: '0.75rem',
              marginTop: '0.5rem',
              color: '#999',
              textAlign: 'center',
            }}
          >
            {detectedGesture.handedness} hand •{' '}
            {Math.round((detectedGesture.confidence || 0) * 100)}% confidence
          </p>
        )}
      </div>
    );
  }

  // State 4: Default state (no peace sign or waiting for gesture)
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
          Show a peace sign! ✌️
        </p>
        <p style={{ fontSize: '0.875rem', color: '#999' }}>
          A random photo will appear when you make the gesture
        </p>
      </div>
    </div>
  );
};
