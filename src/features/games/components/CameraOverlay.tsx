/**
 * Camera Overlay Component
 * Small corner overlay showing player's camera feed during gameplay
 */

import React, { useRef, useEffect, useMemo } from "react";
import { useCamera } from "@/features/discovery/hooks/useCamera";

interface CameraOverlayProps {
  onVideoReady?: (video: HTMLVideoElement) => void;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({
  onVideoReady,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraOptions = useMemo(
    () => ({
      videoConstraints: {
        width: { ideal: 480 },
        height: { ideal: 270 },
        frameRate: { ideal: 30, max: 30 },
        facingMode: "user" as const,
      },
    }),
    [],
  );
  const { stream, isLoading, error } = useCamera(cameraOptions);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;

    const handleLoadedMetadata = () => {
      onVideoReady?.(video);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [stream, onVideoReady]);

  if (error) {
    return (
      <div className="fixed right-5 bottom-5 z-[100] h-[150px] w-[200px] overflow-hidden rounded-[12px] border-[3px] border-solid border-[rgba(255,255,255,0.5)] shadow-[0_4px_20px_rgba(0,0,0,0.3)] [backface-visibility:hidden] [transform:translateZ(0)]">
        <div className="flex h-full w-full items-center justify-center bg-[rgba(0,0,0,0.7)] p-[10px] text-center text-[12px] text-white">Camera unavailable</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed right-5 bottom-5 z-[100] h-[150px] w-[200px] overflow-hidden rounded-[12px] border-[3px] border-solid border-[rgba(255,255,255,0.5)] shadow-[0_4px_20px_rgba(0,0,0,0.3)] [backface-visibility:hidden] [transform:translateZ(0)]">
        <div className="flex h-full w-full items-center justify-center bg-[rgba(0,0,0,0.7)] p-[10px] text-center text-[12px] text-white">Loading camera...</div>
      </div>
    );
  }

  return (
    <div className="fixed right-5 bottom-5 z-[100] h-[150px] w-[200px] overflow-hidden rounded-[12px] border-[3px] border-solid border-[rgba(255,255,255,0.5)] shadow-[0_4px_20px_rgba(0,0,0,0.3)] [backface-visibility:hidden] [transform:translateZ(0)]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full -scale-x-100 object-cover [backface-visibility:hidden]"
      />
    </div>
  );
};
