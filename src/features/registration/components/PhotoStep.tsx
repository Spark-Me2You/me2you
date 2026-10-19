/**
 * PhotoStep Component — Figma "profile-picture-capture" screen
 * Step order: signup → photo → profile → success
 * "Looks good" uploads photo and advances to profile.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useGestureRecognition } from '../../discovery/hooks/useGestureRecognition';
import { getCategoryFromGesture } from '../../discovery/config/gestureMapping';
import pinkBackArrowImg from '../../../assets/pink_back_arrow.svg';
import nextButtonImg from '../../../assets/next_button.svg';
import peaceImg from '../../../assets/peace.png';
import waveImg from '../../../assets/wave.png';
import thumbsUpImg from '../../../assets/thumbsUP.png';

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

    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      // Check if component is still mounted
      if (!videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      // Explicitly play the video
      try {
        await videoRef.current.play();
      } catch (playError) {
        // play() can fail if user hasn't interacted with page
        // Video should still work with autoPlay attribute
        console.warn('[PhotoStep] Video play() failed:', playError);
      }

      // Wait for video to be ready with timeout
      await new Promise<void>((resolve, reject) => {
        const video = videoRef.current;
        if (!video) {
          reject(new Error('Video element not found'));
          return;
        }

        const onLoadedData = () => {
          video.removeEventListener('loadeddata', onLoadedData);
          video.removeEventListener('error', onError);
          setIsCameraReady(true);
          resolve();
        };

        const onError = () => {
          video.removeEventListener('loadeddata', onLoadedData);
          video.removeEventListener('error', onError);
          reject(new Error('Video failed to load'));
        };

        video.addEventListener('loadeddata', onLoadedData);
        video.addEventListener('error', onError);

        // Timeout fallback (5 seconds)
        setTimeout(() => {
          video.removeEventListener('loadeddata', onLoadedData);
          video.removeEventListener('error', onError);

          // Check if video is actually playing
          if (video.readyState >= 2) {
            // HAVE_CURRENT_DATA or better
            setIsCameraReady(true);
            resolve();
          } else {
            reject(new Error('Camera initialization timeout'));
          }
        }, 5000);
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setCameraError('camera access denied — please allow camera access in your browser settings');
        } else if (err.name === 'NotFoundError') {
          setCameraError('no camera found — please connect a camera and try again');
        } else if (err.message.includes('timeout')) {
          setCameraError('camera initialization timeout — please try again');
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

      if (isGestureRecognizerReady) processVideoFrame(video, Date.now());

      canvas.toBlob(
        (blob) => {
          if (blob) {
            setPhoto(blob);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(blob));
            // Keep the stream alive so retake is instant — stopCamera() runs on unmount
          } else {
            setLocalError('failed to capture — please try again');
          }
          setIsProcessing(false);
        },
        'image/jpeg',
        0.9,
      );
    } catch {
      setLocalError('failed to capture — please try again');
      setIsProcessing(false);
    }
  }, [previewUrl, onClearError, isGestureRecognizerReady, processVideoFrame]);

  const handleRetake = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhoto(null);
    setPreviewUrl(null);
    setDetectedCategory(null);
    setDetectedGestureName(null);
    // Stream is still running — no need to restart the camera
  }, [previewUrl]);

  const handleLooksGood = async () => {
    setLocalError(null);
    onClearError();
    if (!photo) { setLocalError('please take a photo first'); return; }
    if (!detectedCategory) {
      setLocalError('no gesture detected — show a clear wave, peace sign, or thumbs up and retake');
      return;
    }
    await onSubmit(photo, detectedCategory);
  };

  const displayError = localError || error || cameraError;
  const isBusy = isSubmitting || isProcessing;

  return (
    <div className="relative flex min-h-screen flex-col pt-[112px]">
      <div className="mb-3 bg-magenta px-5 py-3 text-center">
        <p className="m-0 font-averia text-[22px] leading-[1.4] font-normal tracking-[3.74px] text-white">choose a pose!</p>
        <p className="m-0 font-averia text-[22px] leading-[1.4] font-normal tracking-[3.74px] text-white">*do not put hands over face*</p>
      </div>

      {/* Decorative hands */}
      <div className="relative z-[5] -mb-8 h-[110px]">
        <img src={peaceImg} alt="peace" className="absolute top-[-10px] left-7 w-[58px] origin-bottom rotate-[38.55deg]" />
        <img src={waveImg} alt="wave" className="absolute top-[25px] left-1/2 w-[80px] origin-bottom -translate-x-1/2" />
        <img src={thumbsUpImg} alt="thumbs up" className="absolute top-10 right-7 w-[80px] origin-bottom" />
      </div>

      <div className="mx-[6px] box-border flex h-[420px] flex-col rounded-[46px] bg-glass px-5 pt-[44px] pb-[10px] shadow-glass-card">
        {displayError && (
          <div className="mb-3 rounded-[10px] border border-solid border-[rgba(255,60,60,0.35)] bg-[rgba(255,60,60,0.12)] px-[14px] py-2 text-center font-averia text-[13px] tracking-[0.5px] text-[#b00]">{displayError}</div>
        )}

        {/* Camera / preview area */}
        <div className="relative mb-4 w-full flex-1 overflow-hidden rounded-[8px] bg-[#d9d9d9]">
          {previewUrl && (
            <img src={previewUrl} alt="Profile preview" className="h-full w-full object-cover" />
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full -scale-x-100 object-cover"
            style={{ display: previewUrl ? 'none' : undefined }}
          />
          {!previewUrl && isCameraReady && (
            <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
              <div className="absolute top-1/2 left-[34%] flex aspect-[3/4] w-[44%] -translate-x-1/2 -translate-y-1/2 items-end justify-center rounded-full border-[3px] border-dashed border-[rgba(255,255,255,0.9)] pb-[6px] shadow-[0_0_0_9999px_rgba(0,0,0,0.15)]">
                <span className="font-jersey text-[14px] tracking-[2px] text-white lowercase [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">head</span>
              </div>
              <div className="absolute top-1/2 right-[5%] flex h-[46%] w-[24%] -translate-y-1/2 items-end justify-center rounded-[12px] border-[3px] border-dashed border-[rgba(255,255,255,0.9)] pb-[6px]">
                <span className="font-jersey text-[14px] tracking-[2px] text-white lowercase [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">hand</span>
              </div>
            </div>
          )}
          {!previewUrl && !isCameraReady && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.5)] font-['Andale_Mono','Courier_New',monospace] text-[12px] tracking-[1px] text-white">starting camera...</div>
          )}
          {!previewUrl && isCameraReady && !isGestureRecognizerReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.5)] font-['Andale_Mono','Courier_New',monospace] text-[12px] tracking-[1px] text-white">loading gesture detection...</div>
          )}

          {/* Gesture status — small text, bottom-right of frame */}
          {previewUrl && (
            <div className="pointer-events-none absolute right-[10px] bottom-2 rounded-[4px] bg-[rgba(0,0,0,0.35)] px-[7px] py-[2px] font-['Andale_Mono','Courier_New',monospace] text-[10px] tracking-[0.4px] text-[rgba(255,255,255,0.95)]">
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
          <div className="flex justify-center pt-[10px]">
            <button
              type="button"
              className="block h-16 w-16 cursor-pointer rounded-full border-4 border-solid border-[rgba(255,255,255,0.85)] bg-[rgba(255,255,255,0.55)] shadow-[0_0_0_4px_#e405ac] [transition:transform_0.1s,background_0.1s] active:bg-[rgba(255,255,255,0.85)] active:[transform:scale(0.91)] disabled:cursor-not-allowed disabled:opacity-35"
              onClick={capturePhoto}
              disabled={isBusy || !isCameraReady || !isGestureRecognizerReady}
              aria-label="Capture photo"
            />
          </div>
        ) : (
          /* Photo taken — retake (left, pink) | looks good (right, lime) */
          <div className="flex items-start justify-between pt-[10px]">
            {/* Retake — pink back arrow */}
            <button
              type="button"
              className="flex cursor-pointer flex-col items-center gap-1 border-0 bg-transparent px-2 py-1 text-center font-jersey text-[16px] leading-[1.2] tracking-[2.72px] text-black disabled:cursor-not-allowed disabled:opacity-35"
              onClick={handleRetake}
              disabled={isBusy}
            >
              <img src={pinkBackArrowImg} alt="" className="w-[56px] rotate-[-4.71deg]" />
              retake please!
            </button>

            {/* Looks good — lime next arrow */}
            <button
              type="button"
              className="flex cursor-pointer flex-col items-center gap-1 border-0 bg-transparent px-2 py-1 text-center font-jersey text-[16px] leading-[1.2] tracking-[2.72px] text-black disabled:cursor-not-allowed disabled:opacity-35"
              onClick={handleLooksGood}
              disabled={isBusy || !detectedCategory}
            >
              <img src={nextButtonImg} alt="" className="w-[56px] rotate-[5deg]" />
              {isSubmitting ? '...' : 'looks good!'}
            </button>
          </div>
        )}
      </div>

      {/* Go back */}
      <button
        type="button"
        className="mt-[30px] flex cursor-pointer flex-col items-center gap-1 border-0 bg-transparent px-[18px] pt-3 pb-2 font-jersey text-[24px] tracking-[4.08px] text-black disabled:cursor-not-allowed disabled:opacity-40"
        onClick={onBack}
        disabled={isBusy}
      >
        <img src={pinkBackArrowImg} alt="" className="w-[80px] rotate-[-4.71deg]" />
        go back
      </button>
    </div>
  );
};
