import { useState, useEffect, useRef } from "react";

interface UseCameraOptions {
  videoConstraints?: MediaTrackConstraints;
}

const DEFAULT_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: "user",
};

/**
 * useCamera Hook
 * Manages camera lifecycle and MediaStream for discovery feature
 * Returns camera stream, loading state, and error state
 */
export const useCamera = (options: UseCameraOptions = {}) => {
  const { videoConstraints = DEFAULT_VIDEO_CONSTRAINTS } = options;
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // TODO: Integrate with CameraManager singleton from core/cv
        // import { CameraManager } from '@/core/cv';
        // const cameraManager = CameraManager.getInstance();
        // const mediaStream = await cameraManager.initialize();

        // Direct getUserMedia call for now
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        if (mounted) {
          streamRef.current = mediaStream;
          setStream(mediaStream);
        } else {
          // Cleanup if component unmounted during async operation
          mediaStream.getTracks().forEach((track) => track.stop());
        }
      } catch (err) {
        if (mounted) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to access camera";
          setError(errorMessage);
          console.error("Camera initialization error:", err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initCamera();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [videoConstraints]);

  return { stream, isLoading, error };
};
