import React, { useState, useEffect } from "react";
import { useAppState } from "@/core/state-machine";
import { AppState } from "@/core/state-machine/appStateMachine";
import { useAuth } from "@/core/auth";
import type { RandomImageData } from "../types/image";
import { CameraView } from "./CameraView";
import { RandomImageCard } from "./RandomImageCard";
import type { GestureRecognitionResult } from "../hooks/useGestureRecognition";
import { useImageChambers } from "../hooks/useImageChambers";
import {
  getCategoryFromGesture,
  isSupportedGesture,
  CATEGORY_LIST,
} from "../config/gestureMapping";

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

  // Effect: Pop image from chamber when a supported gesture is detected
  // NOTE: Dependencies are now stable (popImage, getError, isChamberLoading don't change)
  useEffect(() => {
    // Check if any supported gesture is detected
    const isGestureDetected = isSupportedGesture(
      detectedGesture?.gestureName ?? null
    );
    const category = getCategoryFromGesture(
      detectedGesture?.gestureName ?? null
    );

    if (!isGestureDetected || !category) {
      return;
    }

    // Debounce: Only pop if we don't already have image displayed
    // This prevents popping on every frame while gesture is held
    if (imageData) {
      return;
    }

    // Wait for chambers to initialize
    if (!isInitialized) {
      console.log(
        "[DiscoveryView] Chambers not yet initialized, waiting..."
      );
      return;
    }

    // Pop image from chamber (instant - no async!)
    console.log("[DiscoveryView] Popping image from chamber:", category);
    const image = popImage(category);

    if (image) {
      console.log(
        "[DiscoveryView] Image popped:",
        image.image.id,
        "category:",
        image.image.category
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
          `No images available for ${category} gesture in your organization`
        );
      }
    }
  }, [detectedGesture, imageData, isInitialized, popImage, getError, isChamberLoading]);

  // Effect: Clear image when gesture is no longer detected
  useEffect(() => {
    const isGestureDetected = isSupportedGesture(
      detectedGesture?.gestureName ?? null
    );

    if (!isGestureDetected && imageData) {
      // Clear image data when gesture is released
      // This allows fetching a new image on the next gesture
      console.log("[DiscoveryView] Gesture released, clearing image");
      setImageData(null);
      setImageError(null);
    }
  }, [detectedGesture, imageData]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 2rem",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Discovery</h1>
        <button
          onClick={handleBack}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            cursor: "pointer",
            backgroundColor: "#f5f5f5",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        >
          Back to Home
        </button>
      </header>

      {/* Split-screen content */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          padding: "1rem",
          overflow: "hidden",
        }}
      >
        {/* Left side: Camera feed */}
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <CameraView onGestureDetected={setDetectedGesture} />
        </div>

        {/* Right side: Matched profile / results */}
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <RandomImageCard
            detectedGesture={detectedGesture}
            imageData={imageData}
            isLoading={
              detectedGesture?.gestureName
                ? isChamberLoading(
                    getCategoryFromGesture(detectedGesture.gestureName) ?? ""
                  )
                : false
            }
            error={imageError}
          />
        </div>
      </div>
    </div>
  );
};
