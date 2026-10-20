/**
 * Split Camera Panel
 * Mirrored camera feed divided down the middle so each player can see their half.
 */

import React, { useRef, useEffect, useMemo } from "react";
import { useCamera } from "@/features/discovery/hooks/useCamera";
import { FLAPFLAP_2P_CONFIG } from "../config/flapflap2pConfig";
import type { PlayerId } from "../types/flapflap2p";

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
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-tag border-4 border-solid border-white/40 bg-ink shadow-drop">
        {error ? (
          <div className="flex h-full w-full items-center justify-center font-averia text-[14px] text-white">camera unavailable</div>
        ) : isLoading ? (
          <div className="flex h-full w-full items-center justify-center font-averia text-[14px] text-white">loading camera...</div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full -scale-x-100 object-cover [backface-visibility:hidden]"
          />
        )}

        <div className="absolute top-0 bottom-0 left-1/2 w-1 -translate-x-1/2 bg-white/85 shadow-drop" />

        {PLAYERS.map((id) => {
          const color = FLAPFLAP_2P_CONFIG.PLAYERS[id].CSS_COLOR;
          return (
            <div
              key={id}
              className={`pointer-events-none absolute top-0 bottom-0 box-border flex w-1/2 flex-col items-center justify-between border-4 border-solid py-2 transition-[border-color] duration-200 ease-[ease] ${id === "P1" ? "left-0" : "right-0"}`}
              style={{
                borderColor: present[id] ? color : "transparent",
              }}
            >
              <span className="font-jersey tracking-brand [text-shadow:0_0_4px_#000,0_0_8px_#000] text-[40px] leading-none" style={{ color }}>
                {id.toLowerCase()}
              </span>
              <span className="font-jersey tracking-brand [text-shadow:0_0_4px_#000,0_0_8px_#000] text-[26px] text-white">{getStatus(id)}</span>
            </div>
          );
        })}
      </div>
      <p className="m-0 text-center font-averia text-body-lg text-white/80">stand on your side & flap your arms</p>
    </div>
  );
};
