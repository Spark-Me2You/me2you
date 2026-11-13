/**
 * Arm Flap Detection Hook
 * Detects arm flapping gestures from pose landmarks
 * FlapFlap-specific - not shared across games
 */

import { useRef, useCallback } from "react";
import { PoseLandmark } from "@/shared/utils/gestureConstants";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { FlapEvent } from "../types/flapflap";

interface UseArmFlapOptions {
  velocityThreshold?: number;
  bufferSize?: number;
  cooldownMs?: number;
  onFlap?: (event: FlapEvent) => void;
}

interface UseArmFlapReturn {
  processLandmarks: (landmarks: NormalizedLandmark[]) => void;
  /** Drop buffered samples and the held-signal latch (call when the player leaves view). */
  reset: () => void;
}

const DEFAULT_VELOCITY_THRESHOLD = 0.014;
const DEFAULT_BUFFER_SIZE = 4;
const DEFAULT_COOLDOWN_MS = 230;
const MIN_LANDMARK_VISIBILITY = 0.2;
const RELEASE_THRESHOLD_MULTIPLIER = 0.6;

export const useArmFlap = (
  options: UseArmFlapOptions = {},
): UseArmFlapReturn => {
  const {
    velocityThreshold = DEFAULT_VELOCITY_THRESHOLD,
    bufferSize = DEFAULT_BUFFER_SIZE,
    cooldownMs = DEFAULT_COOLDOWN_MS,
    onFlap,
  } = options;

  // Refs, not state: processLandmarks runs per frame and must not re-render.
  const leftWristBuffer = useRef<number[]>([]);
  const rightWristBuffer = useRef<number[]>([]);
  const lastFlapTime = useRef<number>(0);
  const wasFlapSignalRef = useRef(false);

  const reset = useCallback(() => {
    leftWristBuffer.current = [];
    rightWristBuffer.current = [];
    wasFlapSignalRef.current = false;
  }, []);

  const processLandmarks = useCallback(
    (landmarks: NormalizedLandmark[]) => {
      const now = Date.now();

      const leftWrist = landmarks[PoseLandmark.LEFT_WRIST];
      const rightWrist = landmarks[PoseLandmark.RIGHT_WRIST];
      const leftWristVisible =
        (leftWrist?.visibility ?? 1) >= MIN_LANDMARK_VISIBILITY;
      const rightWristVisible =
        (rightWrist?.visibility ?? 1) >= MIN_LANDMARK_VISIBILITY;

      if (!leftWristVisible && !rightWristVisible) {
        wasFlapSignalRef.current = false;
        return;
      }

      const leftWristY = leftWrist?.y ?? 0;
      const rightWristY = rightWrist?.y ?? 0;

      leftWristBuffer.current.push(leftWristY);
      rightWristBuffer.current.push(rightWristY);

      if (leftWristBuffer.current.length > bufferSize) {
        leftWristBuffer.current.shift();
      }
      if (rightWristBuffer.current.length > bufferSize) {
        rightWristBuffer.current.shift();
      }

      if (leftWristBuffer.current.length < bufferSize) {
        return;
      }

      const leftVelocity = calculateVelocity(leftWristBuffer.current);
      const rightVelocity = calculateVelocity(rightWristBuffer.current);
      const releaseThreshold = velocityThreshold * RELEASE_THRESHOLD_MULTIPLIER;

      const leftFlap = leftWristVisible && leftVelocity > velocityThreshold;
      const rightFlap = rightWristVisible && rightVelocity > velocityThreshold;
      const leftReleased = !leftWristVisible || leftVelocity < releaseThreshold;
      const rightReleased =
        !rightWristVisible || rightVelocity < releaseThreshold;

      if (leftReleased && rightReleased) {
        wasFlapSignalRef.current = false;
      }

      const hasFlapSignal = leftFlap || rightFlap;
      const isRisingEdge = hasFlapSignal && !wasFlapSignalRef.current;

      if (isRisingEdge && now - lastFlapTime.current >= cooldownMs) {
        const arm =
          leftFlap && rightFlap ? "both" : leftFlap ? "left" : "right";
        const velocity = Math.max(leftVelocity, rightVelocity);
        const flapEvent: FlapEvent = { arm, velocity, timestamp: now };

        lastFlapTime.current = now;

        onFlap?.(flapEvent);
      }

      if (hasFlapSignal) {
        wasFlapSignalRef.current = true;
      }
    },
    [velocityThreshold, bufferSize, cooldownMs, onFlap],
  );

  return { processLandmarks, reset };
};

function calculateVelocity(buffer: number[]): number {
  if (buffer.length < 2) return 0;
  const oldest = buffer[0];
  const newest = buffer[buffer.length - 1];
  return (newest - oldest) / buffer.length;
}
