import React, { useState, useEffect } from "react";
import { useAppState } from "@/core/state-machine";
import { AppState } from "@/core/state-machine/appStateMachine";
import { useAuth } from "@/core/auth";
import { discoveryService } from "../services/discoveryService";
import type { RandomImageData } from "../types/image";
import { CameraView } from "./CameraView";
import { RandomImageCard } from "./RandomImageCard";
import type { GestureRecognitionResult } from "../hooks/useGestureRecognition";
import {
  getCategoryFromGesture,
  isSupportedGesture,
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

  // State for random image data
  const [imageData, setImageData] = useState<RandomImageData | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleBack = () => {
    transitionTo(AppState.IDLE);
  };

  // Effect: Fetch random image when a supported gesture is detected
  useEffect(() => {
    // Check if any supported gesture is detected
    const isGestureDetected = isSupportedGesture(
      detectedGesture?.gestureName ?? null
    );
    const category = getCategoryFromGesture(
      detectedGesture?.gestureName ?? null
    );

    if (!isGestureDetected || !category || !kioskOrgId) {
      return;
    }

    // Debounce: Only fetch if we don't already have image data
    // This prevents refetching on every frame while gesture is held
    if (imageData || isLoadingImage) {
      return;
    }

    const fetchImage = async () => {
      setIsLoadingImage(true);
      setImageError(null);

      try {
        console.log(
          "[DiscoveryView] Fetching random image for org:",
          kioskOrgId,
          "with gesture category:",
          category
        );
        const data = await discoveryService.fetchRandomImage(
          kioskOrgId,
          category
        );

        if (data) {
          console.log(
            "[DiscoveryView] Image fetched:",
            data.image.id,
            "category:",
            data.image.category
          );
          setImageData(data);
        } else {
          console.log(
            "[DiscoveryView] No images available for category:",
            category
          );
          setImageError(
            `No images available for ${category} gesture in your organization`
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch image";
        console.error("[DiscoveryView] Fetch failed:", error);
        setImageError(errorMessage);
      } finally {
        setIsLoadingImage(false);
      }
    };

    fetchImage();
  }, [detectedGesture, kioskOrgId, imageData, isLoadingImage]);

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
            isLoading={isLoadingImage}
            error={imageError}
          />
        </div>
      </div>
    </div>
  );
};
