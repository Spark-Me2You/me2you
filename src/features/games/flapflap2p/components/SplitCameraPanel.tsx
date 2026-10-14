/**
 * Split Camera Panel
 * Mirrored camera feed divided down the middle so each player can see their half.
 */

import React, { useRef, useEffect, useMemo } from "react";
import { useCamera } from "@/features/discovery/hooks/useCamera";
import { FLAPFLAP_2P_CONFIG } from "../config/flapflap2pConfig";
import type { PlayerId } from "../types/flapflap2p";
import styles from "./SplitCameraPanel.module.css";

interface SplitCameraPanelProps {
  onVideoReady?: (video: HTMLVideoElement) => void;
  present: Record<PlayerId, boolean>;
  ready: Record<PlayerId, boolean>;
  showReady: boolean;
}

const PLAYERS: PlayerId[] = ["P1", "P2"];

export const SplitCameraPanel: React.FC<SplitCameraPanelProps> = ({
  onVideoReady,
  present,
  ready,
  showReady,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraOptions = useMemo(
    () => ({
      videoConstraints: {
        width: { ideal: 640 },
        height: { ideal: 480 },
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

  const getStatus = (id: PlayerId): string => {
    if (!present[id]) return "step in";
    if (showReady) return ready[id] ? "ready!" : "flap!";
    return "";
  };

  return (
    <div className={styles.panel}>
      <div className={styles.feed}>
        {error ? (
          <div className={styles.message}>Camera unavailable</div>
        ) : isLoading ? (
          <div className={styles.message}>Loading camera...</div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={styles.video}
          />
        )}

        <div className={styles.divider} />

        {PLAYERS.map((id) => {
          const color = FLAPFLAP_2P_CONFIG.PLAYERS[id].CSS_COLOR;
          return (
            <div
              key={id}
              className={`${styles.half} ${id === "P1" ? styles.left : styles.right}`}
              style={{
                borderColor: present[id] ? color : "transparent",
              }}
            >
              <span className={styles.playerLabel} style={{ color }}>
                {id}
              </span>
              <span className={styles.status}>{getStatus(id)}</span>
            </div>
          );
        })}
      </div>
      <p className={styles.hint}>stand on your side & flap your arms</p>
    </div>
  );
};
