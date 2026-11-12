/**
 * Camera preview — a small, mirrored live feed pinned bottom-left so visitors can see themselves.
 * Reads the shared kiosk stream (SharedCameraProvider); it never opens the camera itself.
 * Styled as a taped polaroid (brand book §5). Renders nothing until the stream is available.
 */

import { useEffect, useRef } from "react";
import { useSharedCamera } from "@/core/cv/SharedCameraProvider";

const FRAME =
  "pointer-events-none fixed bottom-6 left-6 z-[50] flex flex-col items-center gap-2 rounded-[4px] bg-polaroid px-3 pt-3 pb-2 shadow-note select-none origin-bottom-left [transform:rotate(-3deg)_scale(0.85)]";
const TAPE =
  "absolute -top-[11px] left-1/2 h-[22px] w-[90px] -translate-x-1/2 rotate-[4deg] bg-tape/80 shadow-tape";

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
    <div className={FRAME} data-testid="camera-preview">
      <div className={TAPE} />
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-label="live camera preview"
        className="block h-[150px] w-[200px] -scale-x-100 rounded-[2px] bg-ink object-cover"
      />
      <p className="m-0 font-averia text-body-md leading-none tracking-brand text-ink lowercase">
        that's you!
      </p>
    </div>
  );
};
