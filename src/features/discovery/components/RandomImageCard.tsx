import React from "react";
import type { GestureRecognitionResult } from "../hooks/useGestureRecognition";
import type { RandomImageData } from "../types/image";
import { getGestureMapping } from "../config/gestureMapping";
import { BorderProgress } from "./BorderProgress";
import styles from "./RandomImageCard.module.css";

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
    return <div className={styles.emptyState} />;
  }

  // State 2: Loading image
  if (isLoading) {
    return (
      <div className={styles.emptyState}>
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
      <div className={styles.emptyState}>
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
        className={`${styles.container} ${isFlashing ? styles.completionFlash : ""}`}
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
        <div className={styles.photoContainer}>
          <img
            src={imageUrl}
            alt={`Photo by ${owner.name}`}
            className={styles.photo}
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
          className={styles.namecard}
          onClick={() => onViewProfile?.(imageData)}
          type="button"
        >
          <p className={styles.greeting}>hi! i'm {owner.name}!</p>
          {owner.pronouns && (
            <p className={styles.pronouns}>{owner.pronouns}</p>
          )}
          {owner.major && <p className={styles.major}>{owner.major}</p>}

          <div className={styles.statusGroup}>
            <p className={styles.statusLabel}>status:</p>
            <div className={styles.statusBox}>
              <p className={styles.statusText}>
                {owner.status || "No status set"}
              </p>
            </div>
          </div>

        </button>
      </div>
    );
  }

  // Fallback - empty state
  return <div className={styles.emptyState} />;
};
