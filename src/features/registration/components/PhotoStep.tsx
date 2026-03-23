/**
 * PhotoStep Component — Figma "profile-picture-capture" screen
 * Camera with automatic gesture detection via MediaPipe
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './RegistrationSteps.module.css';
import { useGestureRecognition } from '../../discovery/hooks/useGestureRecognition';
import { getCategoryFromGesture } from '../../discovery/config/gestureMapping';
import backfingerImg from '../../../assets/backfinger.png';
import thumbsUpImg from '../../../assets/thumbsUP.png';
import peaceImg from '../../../assets/peace.png';
import waveImg from '../../../assets/wave.png';

export type GestureCategory = 'wave' | 'peace_sign' | 'thumbs_up';

interface PhotoStepProps {
  onSubmit: (photo: Blob | null, category: GestureCategory) => Promise<boolean>;
  onBack: () => void;
  isSubmitting: boolean;
  error: string | null;
  onClearError: () => void;
}

export const PhotoStep: React.FC<PhotoStepProps> = ({
  onSubmit,
  onBack,
  isSubmitting,
  error,
  onClearError,
}) => {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detectedCategory, setDetectedCategory] = useState<GestureCategory | null>(null);
  const [detectedGestureName, setDetectedGestureName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const {
    detectedGesture,
    isInitialized: isGestureRecognizerReady,
    processVideoFrame,
  } = useGestureRecognition();

  useEffect(() => {
    startCamera();
    return () => { stopCamera(); };
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    const handleLoadedData = () => setIsCameraReady(true);
    videoElement.addEventListener('loadeddata', handleLoadedData);
    return () => videoElement.removeEventListener('loadeddata', handleLoadedData);
  }, []);

  useEffect(() => {
    if (detectedGesture?.gestureName) {
      const category = getCategoryFromGesture(detectedGesture.gestureName);
      if (category) {
        setDetectedCategory(category as GestureCategory);
        setDetectedGestureName(detectedGesture.gestureName);
      }
    }
  }, [detectedGesture]);

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setCameraError('camera access denied — please allow camera access');
        } else if (err.name === 'NotFoundError') {
          setCameraError('no camera found');
        } else {
          setCameraError(`camera error: ${err.message}`);
        }
      } else {
        setCameraError('failed to access camera');
      }
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraReady(false);
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessing(true);
    setLocalError(null);
    onClearError();

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas context unavailable');

      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (isGestureRecognizerReady) {
        processVideoFrame(video, Date.now());
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            setPhoto(blob);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(blob));
            stopCamera();
          } else {
            setLocalError('failed to capture photo — please try again');
          }
          setIsProcessing(false);
        },
        'image/jpeg',
        0.9,
      );
    } catch {
      setLocalError('failed to capture photo — please try again');
      setIsProcessing(false);
    }
  }, [previewUrl, onClearError, isGestureRecognizerReady, processVideoFrame]);

  const handleRetake = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhoto(null);
    setPreviewUrl(null);
    setDetectedCategory(null);
    setDetectedGestureName(null);
    startCamera();
  }, [previewUrl]);

  const handleSubmit = async () => {
    setLocalError(null);
    onClearError();
    if (!photo) {
      setLocalError('please take a photo first');
      return;
    }
    if (!detectedCategory) {
      setLocalError('no gesture detected — show a clear wave, peace sign, or thumbs up and retake');
      return;
    }
    await onSubmit(photo, detectedCategory);
  };

  const displayError = localError || error || cameraError;
  const isBusy = isSubmitting || isProcessing;

  return (
    <div className={styles.photoStepWrapper}>
      <div className={styles.poseTabWrapper}>
        <div className={styles.poseTab}>
          <p className={styles.poseTabText}>choose a pose!</p>
        </div>
      </div>

      {/* Decorative hands that overlap the camera card */}
      <div className={styles.handsRow}>
        <img src={peaceImg} alt="peace" className={styles.handPeace} />
        <img src={waveImg} alt="wave" className={styles.handWave} />
        <img src={thumbsUpImg} alt="thumbs up" className={styles.handThumb} />
      </div>

      <div className={styles.cameraCard}>
        {displayError && (
          <div className={styles.photoErrorBanner}>{displayError}</div>
        )}

        <div className={styles.cameraArea}>
          {previewUrl ? (
            <img src={previewUrl} alt="Profile preview" className={styles.cameraPreview} />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={styles.cameraFeed}
              />
              {!isCameraReady && !cameraError && (
                <div className={styles.cameraLoadingOverlay}>starting camera...</div>
              )}
            </>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div className={styles.cameraBottomRow}>
          {/* Left: retake (only when photo taken) */}
          <div>
            {previewUrl && (
              <div className={styles.retakeGroup}>
                <img src={thumbsUpImg} alt="" className={styles.retakeFinger} />
                <button
                  type="button"
                  className={styles.retakeBtn}
                  onClick={handleRetake}
                  disabled={isBusy}
                >
                  retake{'\n'}please!
                </button>
              </div>
            )}
          </div>

          {/* Center: capture button (no photo) or done button (photo taken) */}
          {!previewUrl ? (
            <button
              type="button"
              className={styles.captureBtn}
              onClick={capturePhoto}
              disabled={isBusy || !isCameraReady}
              aria-label="Capture photo"
            />
          ) : (
            <div className={styles.submitThumbGroup}>
              <img src={thumbsUpImg} alt="" className={styles.submitThumbFinger} />
              <button
                type="button"
                className={styles.submitThumbBtn}
                onClick={handleSubmit}
                disabled={isBusy || !detectedCategory}
              >
                {isSubmitting ? '...' : "looks good!"}
              </button>
            </div>
          )}

          {/* Right: gesture status */}
          <div>
            {previewUrl && detectedGestureName && (
              <p className={`${styles.gestureStatus} ${styles.gestureDetected}`}>
                ✓ {detectedGestureName.replace(/_/g, ' ')}
              </p>
            )}
            {previewUrl && !detectedGestureName && (
              <p className={styles.gestureStatus}>detecting...</p>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.photoStepBackBtn}
        onClick={onBack}
        disabled={isBusy}
      >
        <img src={backfingerImg} alt="" className={styles.photoStepBackFinger} />
        go back
      </button>
    </div>
  );
};
