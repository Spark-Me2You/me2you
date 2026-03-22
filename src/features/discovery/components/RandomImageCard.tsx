import React from "react";
import type { GestureRecognitionResult } from "../hooks/useGestureRecognition";
import type { RandomImageData } from "../types/image";
import {
  GESTURE_MAPPINGS,
  getGestureMapping,
} from "../config/gestureMapping";

/**
 * RandomImageCard Component Props
 */
interface RandomImageCardProps {
  detectedGesture?: GestureRecognitionResult | null;
  imageData?: RandomImageData | null;
  isLoading?: boolean;
  error?: string | null;
  onViewProfile?: (imageData: RandomImageData) => void;
}

/**
 * RandomImageCard Component
 * Displays a random public image with owner info when a supported gesture is detected
 * Right side of the discovery split-screen layout
 *
 * Supported gestures: Peace Sign (Victory), Wave (Open_Palm), Thumbs Up (Thumb_Up)
 *
 * States:
 * 1. Default - Show instructions for all available gestures
 * 2. Loading - Show loading message while fetching image
 * 3. Error - Show error message if fetch fails
 * 4. Success - Display image with owner's display name and bio
 */
export const RandomImageCard: React.FC<RandomImageCardProps> = ({
  detectedGesture,
  imageData,
  isLoading,
  error,
  onViewProfile,
}) => {
  // Check if any supported gesture is detected
  const gestureMapping = getGestureMapping(detectedGesture?.gestureName ?? null);
  const isGestureDetected = gestureMapping !== null;

  // State 1: Loading image
  if (isGestureDetected && isLoading) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px dashed #ccc",
          borderRadius: "8px",
          backgroundColor: "#f5f5f5",
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "1.2rem", color: "#666" }}>Loading image...</p>
        </div>
      </div>
    );
  }

  // State 2: Error occurred
  if (isGestureDetected && error) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px dashed #ccc",
          borderRadius: "8px",
          backgroundColor: "#fff3cd",
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: "1.2rem",
              color: "#856404",
              marginBottom: "0.5rem",
            }}
          >
            {error}
          </p>
          <p style={{ fontSize: "0.875rem", color: "#856404" }}>
            Try showing the gesture again or try a different gesture
          </p>
        </div>
      </div>
    );
  }

  // State 3: Image loaded successfully
  if (isGestureDetected && imageData) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          border: "2px solid #4caf50",
          borderRadius: "8px",
          backgroundColor: "#fff",
          padding: "1.5rem",
          overflow: "hidden",
        }}
      >
        {/* Image container */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1rem",
            overflow: "hidden",
            borderRadius: "4px",
            backgroundColor: "#f5f5f5",
          }}
        >
          <img
            src={imageData.imageUrl}
            alt={`Photo by ${imageData.owner.name}`}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
            onError={(e) => {
              // Fallback if image fails to load
              console.error(
                "[ImagePlaceholder] Failed to load image:",
                imageData.imageUrl,
              );
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        {/* User info */}
        <div
          style={{
            borderTop: "1px solid #e0e0e0",
            paddingTop: "1rem",
          }}
        >
          <h3
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "1.5rem",
              color: "#333",
            }}
          >
            {imageData.owner.name}
          </h3>
          {imageData.owner.status && (
            <p
              style={{
                margin: 0,
                fontSize: "1rem",
                color: "#666",
                lineHeight: 1.5,
              }}
            >
              {imageData.owner.status}
            </p>
          )}

          {/* Find out more button */}
          {onViewProfile && (
            <button
              onClick={() => onViewProfile(imageData)}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                marginTop: "1rem",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: "#4caf50",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Find out more about me
            </button>
          )}
        </div>

        {/* Display which gesture was used */}
        {gestureMapping && (
          <p
            style={{
              fontSize: "0.875rem",
              marginTop: "0.5rem",
              color: "#4caf50",
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            Matched with: {gestureMapping.displayName}
          </p>
        )}

        {/* Gesture info (optional, for debugging) */}
        {detectedGesture?.handedness && (
          <p
            style={{
              fontSize: "0.75rem",
              marginTop: "0.25rem",
              color: "#999",
              textAlign: "center",
            }}
          >
            {detectedGesture.handedness} hand •{" "}
            {Math.round((detectedGesture.confidence || 0) * 100)}% confidence
          </p>
        )}
      </div>
    );
  }

  // State 4: Default state (no gesture or waiting for gesture)
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px dashed #ccc",
        borderRadius: "8px",
        backgroundColor: "#f5f5f5",
        padding: "2rem",
      }}
    >
      <div style={{ textAlign: "center", color: "#666" }}>
        <p
          style={{
            fontSize: "1.2rem",
            marginBottom: "1rem",
            fontWeight: 600,
          }}
        >
          Try one of these gestures:
        </p>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {GESTURE_MAPPINGS.map((mapping) => (
            <p
              key={mapping.gestureName}
              style={{ fontSize: "1rem", margin: 0, color: "#666" }}
            >
              {mapping.instructionText}
            </p>
          ))}
        </div>
        <p style={{ fontSize: "0.875rem", color: "#999", marginTop: "1rem" }}>
          A random image from your organization will appear when you make a
          gesture
        </p>
      </div>
    </div>
  );
};
