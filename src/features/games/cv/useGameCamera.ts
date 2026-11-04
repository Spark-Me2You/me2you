/**
 * The one way a game gets its camera.
 *
 * Games currently open their own low-resolution stream, separate from the
 * 1280x720 one in SharedCameraProvider that the CV cursor reads. Whether games
 * should move to the shared stream is still to be compared on the kiosk. This
 * hook is where that change would be made, so games shouldn't call useCamera
 * or getUserMedia themselves.
 */

import { useCallback, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { useCamera } from "@/features/discovery/hooks/useCamera";

export const GAME_CAMERA_DEFAULT_WIDTH = 640;
export const GAME_CAMERA_DEFAULT_HEIGHT = 480;

interface UseGameCameraOptions {
  width?: number;
  height?: number;
}

export interface UseGameCameraReturn {
  /** The element attached with attachVideo. Pass it to useInferenceLoop. */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Use as the ref of the game's <video autoPlay playsInline muted />. */
  attachVideo: (video: HTMLVideoElement | null) => void;
  isLoading: boolean;
  error: string | null;
}

export const useGameCamera = ({
  width = GAME_CAMERA_DEFAULT_WIDTH,
  height = GAME_CAMERA_DEFAULT_HEIGHT,
}: UseGameCameraOptions = {}): UseGameCameraReturn => {
  // useCamera reopens the device whenever the constraints object changes.
  const cameraOptions = useMemo(
    () => ({
      videoConstraints: {
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: 30, max: 30 },
        facingMode: "user" as const,
      },
    }),
    [width, height],
  );
  const { stream, isLoading, error } = useCamera(cameraOptions);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Depends on stream so React re-runs it when the stream arrives, including
  // for a <video> that was already mounted.
  const attachVideo = useCallback(
    (video: HTMLVideoElement | null) => {
      videoRef.current = video;
      if (video) video.srcObject = stream;
    },
    [stream],
  );

  return { videoRef, attachVideo, isLoading, error };
};
