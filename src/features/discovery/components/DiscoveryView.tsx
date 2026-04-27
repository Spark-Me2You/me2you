import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppState } from "@/core/state-machine";
import { AppState } from "@/core/state-machine/appStateMachine";
import { useAuth } from "@/core/auth";
import type { RandomImageData } from "../types/image";
import { CameraView } from "./CameraView";
import { RandomImageCard } from "./RandomImageCard";
import { ProfileCardView } from "./ProfileCardView";
import { PoseOverlay } from "./PoseOverlay";
import type { GestureRecognitionResult } from "../hooks/useGestureRecognition";
import { useImageChambers } from "../hooks/useImageChambers";
import { useProfileTimer } from "../hooks/useProfileTimer";
import {
  getCategoryFromGesture,
  isSupportedGesture,
  CATEGORY_LIST,
} from "../config/gestureMapping";
import { ExitButton } from "@/shared/components";
import styles from "./DiscoveryView.module.css";

/**
 * DiscoveryView Component
 * Main view for gesture-based discovery feature
 * Split-screen layout: camera feed (left) + matched profile/results (right)
 */
export const DiscoveryView: React.FC = () => {
  const { transitionTo } = useAppState();
  const { kioskOrgId } = useAuth();
  const [detectedGesture, setDetectedGesture] =
    useState<GestureRecognitionResult | null>(null);

  // State for currently displayed image (preserves interaction model)
  const [imageData, setImageData] = useState<RandomImageData | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // View mode state for profile detail navigation
  const [viewMode, setViewMode] = useState<"discovery" | "profile-detail">(
    "discovery",
  );
  const [selectedProfile, setSelectedProfile] =
    useState<RandomImageData | null>(null);

  // Ref to track if we've already popped an image for current gesture
  // Prevents infinite loops from useEffect re-running when imageData changes
  const hasPoppedImageRef = useRef<boolean>(false);

  // Timer state for hands-free navigation
  const [isFlashing, setIsFlashing] = useState(false);
  const previousImageIdRef = useRef<string | null>(null);
  const gestureReleaseTimeoutRef = useRef<number | null>(null);

  // Initialize image chambers for all gesture categories
  // CRITICAL: Use pre-computed CATEGORY_LIST to avoid recreating array on every render
  // (which would trigger multiple useEffect re-runs in useImageChambers)
  const {
    popImage,
    isLoading: isChamberLoading,
    getError,
    isInitialized,
  } = useImageChambers(kioskOrgId, CATEGORY_LIST);

  const handleBack = () => {
    transitionTo(AppState.IDLE);
  };

  // Handler for viewing profile detail
  const handleViewProfile = useCallback((profileData: RandomImageData) => {
    setSelectedProfile(profileData);
    setViewMode("profile-detail");
  }, []);

  // Handler for returning to discovery view
  const handleBackToDiscovery = useCallback(() => {
    setViewMode("discovery");
    setSelectedProfile(null);
  }, []);

  // Handler for timer completion
  const handleTimerComplete = useCallback(() => {
    if (imageData) {
      // Start flash animation
      setIsFlashing(true);

      // Navigate after flash completes (400ms)
      setTimeout(() => {
        setIsFlashing(false);
        handleViewProfile(imageData);
      }, 400);
    }
  }, [imageData, handleViewProfile]);

  // Timer hook for hands-free navigation
  const {
    progress: timerProgress,
    start: startTimer,
    reset: resetTimer,
  } = useProfileTimer({ onComplete: handleTimerComplete });

  // Effect: Pop image from chamber when a supported gesture is detected
  // NOTE: Removed imageData from dependencies to prevent infinite loop
  // Uses hasPopgedImageRef to track if we've already popped for this gesture
  useEffect(() => {
    // Check if any supported gesture is detected
    const isGestureDetected = isSupportedGesture(
      detectedGesture?.gestureName ?? null,
    );
    const category = getCategoryFromGesture(
      detectedGesture?.gestureName ?? null,
    );

    if (!isGestureDetected || !category) {
      // No gesture detected - reset the flag
      hasPoppedImageRef.current = false;
      return;
    }

    // Debounce: Only pop if we haven't already popped for this gesture
    // This prevents popping on every frame while gesture is held
    if (hasPoppedImageRef.current) {
      return;
    }

    // Wait for chambers to initialize
    if (!isInitialized) {
      console.log("[DiscoveryView] Chambers not yet initialized, waiting...");
      return;
    }

    // Mark that we're popping an image for this gesture
    hasPoppedImageRef.current = true;

    // Pop image from chamber (instant - no async!)
    console.log("[DiscoveryView] Popping image from chamber:", category);
    const image = popImage(category);

    if (image) {
      console.log(
        "[DiscoveryView] Image popped:",
        image.image.id,
        "category:",
        image.image.category,
      );
      setImageData(image);
      setImageError(null);
    } else {
      // No image available - check for error or loading state
      const error = getError(category);
      if (error) {
        console.warn("[DiscoveryView] Chamber error:", error);
        setImageError(error);
      } else if (isChamberLoading(category)) {
        console.log("[DiscoveryView] Chamber still loading for:", category);
        setImageError(null); // Will show loading state in UI
      } else {
        console.warn("[DiscoveryView] Chamber empty for:", category);
        setImageError(
          `No images available for ${category} gesture in your organization`,
        );
      }
    }
  }, [detectedGesture, isInitialized, popImage, getError, isChamberLoading]);

  // Effect: Clear image when gesture is no longer detected
  // Debounced to avoid one-frame detection drops from resetting the timer.
  // Removed imageData from dependencies to prevent infinite loop
  useEffect(() => {
    const isGestureDetected = isSupportedGesture(
      detectedGesture?.gestureName ?? null,
    );

    if (isGestureDetected) {
      if (gestureReleaseTimeoutRef.current !== null) {
        window.clearTimeout(gestureReleaseTimeoutRef.current);
        gestureReleaseTimeoutRef.current = null;
      }
      return;
    }

    if (gestureReleaseTimeoutRef.current !== null) {
      return;
    }

    gestureReleaseTimeoutRef.current = window.setTimeout(() => {
      console.log("[DiscoveryView] Gesture released, clearing image");
      setImageData(null);
      setImageError(null);
      hasPoppedImageRef.current = false;
      gestureReleaseTimeoutRef.current = null;
    }, 10);

    return () => {
      if (gestureReleaseTimeoutRef.current !== null) {
        window.clearTimeout(gestureReleaseTimeoutRef.current);
        gestureReleaseTimeoutRef.current = null;
      }
    };
  }, [detectedGesture]);

  useEffect(() => {
    return () => {
      if (gestureReleaseTimeoutRef.current !== null) {
        window.clearTimeout(gestureReleaseTimeoutRef.current);
      }
    };
  }, []);

  // Effect: Start/reset timer based on imageData changes
  useEffect(() => {
    const currentImageId = imageData?.image?.id ?? null;
    const previousImageId = previousImageIdRef.current;

    // Case 1: Image was cleared (gesture released)
    if (currentImageId === null) {
      resetTimer();
      previousImageIdRef.current = null;
      return;
    }

    // Case 2: New image displayed (first image or different image)
    if (currentImageId !== previousImageId) {
      resetTimer(); // Reset first to clear any existing timer
      startTimer(); // Start fresh timer for new image
      previousImageIdRef.current = currentImageId;
    }

    // Case 3: Same image, timer continues (no action needed)
  }, [imageData, resetTimer, startTimer]);

  // Profile detail — replaces discovery entirely so nothing overlaps
  if (viewMode === "profile-detail" && selectedProfile) {
    return (
      <ProfileCardView
        profileData={selectedProfile}
        onBack={handleBackToDiscovery}
        onHome={() => transitionTo(AppState.IDLE)}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* Left side: Camera feed */}
      <div className={styles.leftPanel}>
        <CameraView onGestureDetected={setDetectedGesture} />
      </div>

      {/* Right side: Matched profile / results */}
      <div className={styles.rightPanel}>
        <RandomImageCard
          detectedGesture={detectedGesture}
          imageData={imageData}
          isLoading={
            detectedGesture?.gestureName
              ? isChamberLoading(
                  getCategoryFromGesture(detectedGesture.gestureName) ?? "",
                )
              : false
          }
          error={imageError}
          onViewProfile={handleViewProfile}
          timerProgress={timerProgress}
          isFlashing={isFlashing}
        />
      </div>

      {/* "choose a pose:" overlay - always visible */}
      <PoseOverlay />

      <ExitButton onClick={handleBack} />
    </div>
  );
};
