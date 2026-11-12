/**
 * Camera preview — a small, mirrored live feed pinned bottom-left so visitors can see themselves.
 * Reads the shared kiosk stream (SharedCameraProvider); it never opens the camera itself.
 * Styled as a taped polaroid (brand book §5). Renders nothing until the stream is available.
 */

import { useEffect, useRef } from "react";
import { useSharedCamera } from "@/core/cv/SharedCameraProvider";
import { Polaroid } from "./Polaroid";

const POSITION =
  "pointer-events-none fixed bottom-6 left-6 z-[50] origin-bottom-left [transform:rotate(-3deg)_scale(0.85)]";

export const CameraPreview: React.FC = () => {
  const { stream } = useSharedCamera();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => {
      // Autoplay of a muted inline video is allowed; ignore the rare interrupted-play rejection.
    });
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  if (!stream) return null;

  return (
    <Polaroid className={POSITION} caption="that's you!" data-testid="camera-preview">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-label="live camera preview"
        className="block h-[150px] w-[200px] -scale-x-100 rounded-[2px] bg-ink object-cover"
      />
    </Polaroid>
  );
};
