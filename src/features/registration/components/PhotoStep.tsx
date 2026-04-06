/**
 * PhotoStep Component — Figma "profile-picture-capture" screen
 * Step order: signup → photo → profile → success
 * "Looks good" uploads photo and advances to profile.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './RegistrationSteps.module.css';
import { useGestureRecognition } from '../../discovery/hooks/useGestureRecognition';
import { getCategoryFromGesture } from '../../discovery/config/gestureMapping';
import { useFaceCrop } from '../hooks/useFaceCrop';
import { FaceNotDetectedError } from '../services/faceCropService';
import backfingerImg from '../../../assets/backfinger.png';
import thumbsUpImg from '../../../assets/thumbsUP.png';
import peaceImg from '../../../assets/peace.png';
import waveImg from '../../../assets/wave.png';

export type GestureCategory = 'wave' | 'peace_sign' | 'thumbs_up';

interface PhotoStepProps {
  onSubmit: (original: Blob, cropped: Blob, category: GestureCategory) => Promise<boolean>;
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
  const [originalPhoto, setOriginalPhoto] = useState<Blob | null>(null);
  const [croppedPhoto, setCroppedPhoto] = useState<Blob | null>(null);
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

  const {
    isInitializing: isFaceCropInitializing,
    isProcessing: isFaceCropProcessing,
    cropPhoto,
  } = useFaceCrop();

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
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') setCameraError('camera access denied — please allow camera access');
        else if (err.name === 'NotFoundError') setCameraError('no camera found');
        else setCameraError(`camera error: ${err.message}`);
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

  const capturePhoto = useCallback(async () => {
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

      // Fire-and-forget gesture detection (don't block on it)
      if (isGestureRecognizerReady) {
        Promise.resolve().then(() => processVideoFrame(video, Date.now())).catch((err) => {
          console.error('[PhotoStep] Gesture detection error:', err);
        });
      }

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setLocalError('failed to capture — please try again');
            setIsProcessing(false);
            return;
          }

          // Crop the photo using face detection
          try {
            const cropResult = await cropPhoto(blob);
            setOriginalPhoto(cropResult.originalBlob);
            setCroppedPhoto(cropResult.croppedBlob);

            // Show cropped version as preview
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(cropResult.croppedBlob));

            console.log('[PhotoStep] Photo cropped successfully:', cropResult.cropMetadata);
          } catch (error) {
            if (error instanceof FaceNotDetectedError) {
              setLocalError('no face detected — center your face and try again');
            } else {
              setLocalError('photo processing failed — please try again');
            }
            setOriginalPhoto(null);
            setCroppedPhoto(null);
          } finally {
            setIsProcessing(false);
          }
        },
        'image/jpeg',
        0.9,
      );
    } catch {
      setLocalError('failed to capture — please try again');
      setIsProcessing(false);
    }
  }, [previewUrl, onClearError, isGestureRecognizerReady, processVideoFrame, cropPhoto]);

  const handleRetake = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setOriginalPhoto(null);
    setCroppedPhoto(null);
    setPreviewUrl(null);
    setDetectedCategory(null);
    setDetectedGestureName(null);
    setLocalError(null);
    // Stream is still running — no need to restart the camera
  }, [previewUrl]);

  const handleLooksGood = async () => {
    setLocalError(null);
    onClearError();
    if (!originalPhoto || !croppedPhoto) {
      setLocalError('please take a photo first');
      return;
    }
    if (!detectedCategory) {
      setLocalError('no gesture detected — show a clear wave, peace sign, or thumbs up and retake');
      return;
    }
    await onSubmit(originalPhoto, croppedPhoto, detectedCategory);
  };

  const displayError = localError || error || cameraError;
  const isBusy = isSubmitting || isProcessing || isFaceCropProcessing;

  return (
    <div className={styles.photoStepWrapper}>
      <div className={styles.poseTabWrapper}>
        <div className={styles.poseTab}>
          <p className={styles.poseTabText}>choose a pose!</p>
        </div>
      </div>

      {/* Decorative hands */}
      <div className={styles.handsRow}>
        <img src={peaceImg} alt="peace" className={styles.handPeace} />
        <img src={waveImg} alt="wave" className={styles.handWave} />
        <img src={thumbsUpImg} alt="thumbs up" className={styles.handThumb} />
      </div>

      <div className={styles.cameraCard}>
        {displayError && (
          <div className={styles.photoErrorBanner}>{displayError}</div>
        )}

        {/* Camera / preview area */}
        <div className={styles.cameraArea}>
          {previewUrl && (
            <img src={previewUrl} alt="Profile preview" className={styles.cameraPreview} />
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={styles.cameraFeed}
            style={{ display: previewUrl ? 'none' : undefined }}
          />
          {!previewUrl && !isCameraReady && !cameraError && (
            <div className={styles.cameraLoadingOverlay}>starting camera...</div>
          )}

          {/* Gesture status — small text, bottom-right of frame */}
          {previewUrl && (
            <div className={styles.gestureOverlay}>
              {detectedGestureName
                ? `✓ ${detectedGestureName.replace(/_/g, ' ')}`
                : 'detecting...'}
            </div>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Bottom controls */}
        {!previewUrl ? (
          /* No photo yet — centered capture button */
          <div className={styles.captureCenter}>
            <button
              type="button"
              className={styles.captureBtn}
              onClick={capturePhoto}
              disabled={isBusy || !isCameraReady || isFaceCropInitializing}
              aria-label="Capture photo"
            />
            {isFaceCropInitializing && (
              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '14px', color: '#666' }}>
                loading face detector...
              </div>
            )}
          </div>
        ) : (
          /* Photo taken — retake (left) | looks good (right) */
          <div className={styles.photoActionRow}>
            {/* Retake */}
            <button
              type="button"
              className={styles.photoActionBtn}
              onClick={handleRetake}
              disabled={isBusy}
            >
              <img src={thumbsUpImg} alt="" className={styles.retakeFinger} />
              retake please!
            </button>

            {/* Looks good */}
            <button
              type="button"
              className={styles.photoActionBtn}
              onClick={handleLooksGood}
              disabled={isBusy || !detectedCategory}
            >
              <img src={thumbsUpImg} alt="" className={styles.looksGoodFinger} />
              {isSubmitting ? '...' : 'looks good!'}
            </button>
          </div>
        )}
      </div>

      {/* Go back */}
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
