/**
 * Camera Overlay Component
 * Small corner overlay showing player's camera feed during gameplay
 */

import React, { useRef, useEffect } from "react";
import { useCamera } from "@/features/discovery/hooks/useCamera";
import styles from "./CameraOverlay.module.css";

interface CameraOverlayProps {
  onVideoReady?: (video: HTMLVideoElement) => void;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({
  onVideoReady,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, isLoading, error } = useCamera();

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
      <div className={styles.overlay}>
        <div className={styles.errorState}>Camera unavailable</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.overlay}>
        <div className={styles.loadingState}>Loading camera...</div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={styles.video}
      />
    </div>
  );
};
