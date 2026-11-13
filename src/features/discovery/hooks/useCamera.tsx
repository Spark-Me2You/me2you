import { useSharedCamera } from "@/core/cv/SharedCameraProvider";
import { useState, useEffect, useRef } from "react";

interface UseCameraOptions {
  videoConstraints?: MediaTrackConstraints;
}

/**
 * useCamera Hook
 * Returns the shared camera stream from SharedCameraProvider, so there is one camera
 * stream for the whole kiosk. The shared stream is never stopped from here.
 *
 * Passing `videoConstraints` opts out and opens a private stream with those constraints
 * (the games use this for smaller previews); that stream is stopped on unmount.
 */
export const useCamera = (options: UseCameraOptions = {}) => {
  const shared = useSharedCamera();
  const { videoConstraints } = options;
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!videoConstraints) return;
    let mounted = true;

    const initCamera = async () => {
      try {
        setIsLoading(true);
        setError(null);

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

  return videoConstraints ? { stream, isLoading, error } : shared;
};
