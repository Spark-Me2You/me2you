/**
 * Arm Flap Detection Hook
 * Detects arm flapping gestures from pose landmarks
 * FlapFlap-specific - not shared across games
 */

import { useState, useRef, useCallback } from "react";
import { PoseLandmark } from "@/shared/utils/gestureConstants";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { FlapEvent } from "../types/flapflap";

interface UseArmFlapOptions {
  velocityThreshold?: number;
  bufferSize?: number;
  cooldownMs?: number;
  publishState?: boolean;
  onFlap?: (event: FlapEvent) => void;
}

interface UseArmFlapReturn {
  flapDetected: boolean;
  lastFlap: FlapEvent | null;
  processLandmarks: (landmarks: NormalizedLandmark[]) => void;
}

const DEFAULT_VELOCITY_THRESHOLD = 0.012;
const DEFAULT_BUFFER_SIZE = 4;
const DEFAULT_COOLDOWN_MS = 250;
const MIN_LANDMARK_VISIBILITY = 0.35;

export const useArmFlap = (
  options: UseArmFlapOptions = {},
): UseArmFlapReturn => {
  const {
    velocityThreshold = DEFAULT_VELOCITY_THRESHOLD,
    bufferSize = DEFAULT_BUFFER_SIZE,
    cooldownMs = DEFAULT_COOLDOWN_MS,
    publishState = true,
    onFlap,
  } = options;

  // Use refs instead of state to avoid re-renders
  const flapDetectedRef = useRef(false);
  const lastFlapRef = useRef<FlapEvent | null>(null);
  const [flapDetected, setFlapDetected] = useState(false);
  const [lastFlap, setLastFlap] = useState<FlapEvent | null>(null);

  const leftWristBuffer = useRef<number[]>([]);
  const rightWristBuffer = useRef<number[]>([]);
  const lastFlapTime = useRef<number>(0);
  const wasFlapSignalRef = useRef(false);

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

      if (now - lastFlapTime.current < cooldownMs) {
        return;
      }

      const leftVelocity = calculateVelocity(leftWristBuffer.current);
      const rightVelocity = calculateVelocity(rightWristBuffer.current);

      const leftFlap = leftWristVisible && leftVelocity > velocityThreshold;
      const rightFlap = rightWristVisible && rightVelocity > velocityThreshold;
      const hasFlapSignal = leftFlap || rightFlap;
      const isRisingEdge = hasFlapSignal && !wasFlapSignalRef.current;

      if (isRisingEdge) {
        const arm =
          leftFlap && rightFlap ? "both" : leftFlap ? "left" : "right";
        const velocity = Math.max(leftVelocity, rightVelocity);
        const flapEvent: FlapEvent = { arm, velocity, timestamp: now };

        lastFlapTime.current = now;

        // Update refs first (no re-render)
        flapDetectedRef.current = true;
        lastFlapRef.current = flapEvent;

        onFlap?.(flapEvent);

        if (!publishState) {
          flapDetectedRef.current = false;
          return;
        }

        // Optional state publishing for debug/UI consumers
        setFlapDetected(true);
        setLastFlap(flapEvent);

        // Reset flap detected after short delay
        setTimeout(() => {
          flapDetectedRef.current = false;
          setFlapDetected(false);
        }, 100);
      }

      wasFlapSignalRef.current = hasFlapSignal;
    },
    [velocityThreshold, bufferSize, cooldownMs, publishState, onFlap],
  );

  return { flapDetected, lastFlap, processLandmarks };
};

function calculateVelocity(buffer: number[]): number {
  if (buffer.length < 2) return 0;
  const oldest = buffer[0];
  const newest = buffer[buffer.length - 1];
  return (newest - oldest) / buffer.length;
}
