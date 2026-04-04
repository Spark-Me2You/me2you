/**
 * Shared Camera Provider
 * Single getUserMedia() call shared by both the CV cursor and discovery gesture recognition.
 * Prevents camera stream conflicts when both systems need camera access simultaneously.
 */

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface SharedCameraContextValue {
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
}

const SharedCameraContext = createContext<SharedCameraContextValue>({
  stream: null,
  isLoading: true,
  error: null,
});

export function SharedCameraProvider({ children }: { children: ReactNode }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initCamera = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: false,
        });

        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to access camera");
          console.error("[SharedCamera] initialization error:", err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    initCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return (
    <SharedCameraContext.Provider value={{ stream, isLoading, error }}>
      {children}
    </SharedCameraContext.Provider>
  );
}

export const useSharedCamera = () => useContext(SharedCameraContext);
