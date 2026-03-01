import React, { useState } from 'react';
import { useAppState } from '@/core/state-machine';
import { AppState } from '@/core/state-machine/appStateMachine';
import { CameraView } from './CameraView';
import { ImagePlaceholder } from './ImagePlaceholder';
import type { GestureRecognitionResult } from '../hooks/useGestureRecognition';

/**
 * DiscoveryView Component
 * Main view for gesture-based discovery feature
 * Split-screen layout: camera feed (left) + matched profile/results (right)
 */
export const DiscoveryView: React.FC = () => {
  const { transitionTo } = useAppState();
  const [detectedGesture, setDetectedGesture] =
    useState<GestureRecognitionResult | null>(null);

  const handleBack = () => {
    transitionTo(AppState.IDLE);
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Discovery</h1>
        <button
          onClick={handleBack}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            cursor: 'pointer',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        >
          Back to Home
        </button>
      </header>

      {/* Split-screen content */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          padding: '1rem',
          overflow: 'hidden',
        }}
      >
        {/* Left side: Camera feed */}
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <CameraView onGestureDetected={setDetectedGesture} />
        </div>

        {/* Right side: Matched profile / results */}
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ImagePlaceholder detectedGesture={detectedGesture} />
        </div>
      </div>
    </div>
  );
};
