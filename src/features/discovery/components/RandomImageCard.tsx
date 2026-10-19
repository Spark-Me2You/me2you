import React from "react";
import type { GestureRecognitionResult } from "../hooks/useGestureRecognition";
import type { RandomImageData } from "../types/image";
import { getGestureMapping } from "../config/gestureMapping";
import { BorderProgress } from "./BorderProgress";

/**
 * RandomImageCard Component Props
 */
interface RandomImageCardProps {
  detectedGesture?: GestureRecognitionResult | null;
  imageData?: RandomImageData | null;
  isLoading?: boolean;
  error?: string | null;
  onViewProfile?: (imageData: RandomImageData) => void;
  /** Timer progress 0-100 for border animation */
  timerProgress?: number;
  /** Whether to show completion flash */
  isFlashing?: boolean;
}

/**
 * RandomImageCard Component
 * Displays user photo with orange namecard overlay when gesture is detected
 * Right side of the discovery split-screen layout
 *
 * States:
 * 1. Empty - White background when no gesture detected
 * 2. Loading - Show loading message while fetching image
 * 3. Error - Show error message if fetch fails
 * 4. Success - Display photo with orange namecard overlay
 */
export const RandomImageCard: React.FC<RandomImageCardProps> = ({
  detectedGesture,
  imageData,
  isLoading,
  error,
  onViewProfile,
  timerProgress,
  isFlashing,
}) => {
  // Check if any supported gesture is detected
  const gestureMapping = getGestureMapping(
    detectedGesture?.gestureName ?? null,
  );
  const isGestureDetected = gestureMapping !== null;

  // State 1: Empty state (no gesture detected) - White background
  if (!isGestureDetected) {
    return <div className="flex h-full w-full items-center justify-center bg-white" />;
  }

  // State 2: Loading image
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <p
          style={{
            fontFamily: "Averia Libre, cursive",
            fontSize: "24px",
            color: "#666",
          }}
        >
          Loading...
        </p>
      </div>
    );
  }

  // State 3: Error occurred
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <p
          style={{
            fontFamily: "Averia Libre, cursive",
            fontSize: "20px",
            color: "#d32f2f",
            textAlign: "center",
            padding: "2rem",
          }}
        >
          {error}
        </p>
      </div>
    );
  }

  // State 4: Image loaded successfully - Full photo with orange namecard overlay
  if (imageData) {
    const { owner, imageUrl } = imageData;

    return (
      <div
        className={`relative h-full w-full overflow-hidden bg-white ${isFlashing ? "animate-completion-flash" : ""}`}
      >
        {/* Border progress overlay - only show when timer is active */}
        {timerProgress !== undefined && timerProgress > 0 && (
          <BorderProgress
            key={imageData.image.id}
            progress={timerProgress}
            color="#22c55e"
            strokeWidth={7}
          />
        )}

        {/* User photo - full screen */}
        <div className="relative flex h-full w-full items-center justify-center bg-white">
          <img
            src={imageUrl}
            alt={`Photo by ${owner.name}`}
            className="h-full w-full object-cover"
            onError={(e) => {
              console.error(
                "[RandomImageCard] Failed to load image:",
                imageUrl,
              );
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        {/* Orange namecard overlay (clickable) */}
        <button
          className="absolute right-0 bottom-[4%] z-10 flex min-h-[15%] w-[60%] cursor-pointer flex-col items-start gap-[0.3rem] overflow-hidden rounded-[10px] border-0 bg-[rgba(228,72,5,0.92)] px-4 py-[0.9rem] text-left shadow-[0px_4px_8px_rgba(0,0,0,0.3),inset_0px_0px_4px_rgba(0,0,0,0.25),inset_1px_1px_49.9px_14px_rgba(255,255,255,0.2)]"
          onClick={() => onViewProfile?.(imageData)}
          type="button"
        >
          <p className="m-0 mb-[0.15rem] font-jersey text-[28px] leading-[1.1] tracking-[3px] text-[#fff5f5]">hi! i'm {owner.name}!</p>
          {owner.pronouns && (
            <p className="m-0 font-jersey text-[17px] leading-[0.5] tracking-[4px] text-[#fff5f5]">{owner.pronouns}</p>
          )}
          {owner.major && <p className="m-0 font-jersey text-[17px] leading-[0.5] tracking-[4px] text-[#fff5f5]">{owner.major}</p>}

          <div className="mb-2 flex w-full flex-col items-start gap-[0.15rem]">
            <p className="m-0 font-jersey text-[17px] leading-[0.5] tracking-[4px] text-[#fff5f5] mt-2 self-start text-left uppercase">status:</p>
            <div className="mt-[0.3rem] ml-0 flex h-[1.8rem] w-[65%] items-center self-start rounded-[10px] bg-white px-[0.9rem] py-[0.35rem] shadow-[inset_-1px_-1px_4px_0px_rgba(0,0,0,0.25),inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]">
              <p className="m-0 font-jersey text-[18px] leading-[1.2] text-black [word-wrap:break-word]">
                {owner.status || "No status set"}
              </p>
            </div>
          </div>

        </button>
      </div>
    );
  }

  // Fallback - empty state
  return <div className="flex h-full w-full items-center justify-center bg-white" />;
};
