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
}

interface UseArmFlapReturn {
  flapDetected: boolean;
  lastFlap: FlapEvent | null;
  processLandmarks: (landmarks: NormalizedLandmark[]) => void;
}

const DEFAULT_VELOCITY_THRESHOLD = 0.012;
const DEFAULT_BUFFER_SIZE = 4;
const DEFAULT_COOLDOWN_MS = 250;

export const useArmFlap = (
  options: UseArmFlapOptions = {},
): UseArmFlapReturn => {
  const {
    velocityThreshold = DEFAULT_VELOCITY_THRESHOLD,
    bufferSize = DEFAULT_BUFFER_SIZE,
    cooldownMs = DEFAULT_COOLDOWN_MS,
  } = options;

  const [flapDetected, setFlapDetected] = useState(false);
  const [lastFlap, setLastFlap] = useState<FlapEvent | null>(null);

  const leftWristBuffer = useRef<number[]>([]);
  const rightWristBuffer = useRef<number[]>([]);
  const lastFlapTime = useRef<number>(0);

  const processLandmarks = useCallback(
    (landmarks: NormalizedLandmark[]) => {
      const now = Date.now();

      const leftWristY = landmarks[PoseLandmark.LEFT_WRIST]?.y ?? 0;
      const rightWristY = landmarks[PoseLandmark.RIGHT_WRIST]?.y ?? 0;

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

      const leftFlap = leftVelocity > velocityThreshold;
      const rightFlap = rightVelocity > velocityThreshold;

      if (leftFlap || rightFlap) {
        const arm = leftFlap && rightFlap ? "both" : leftFlap ? "left" : "right";
        const velocity = Math.max(leftVelocity, rightVelocity);

        lastFlapTime.current = now;
        setFlapDetected(true);
        setLastFlap({ arm, velocity, timestamp: now });

        setTimeout(() => setFlapDetected(false), 100);
      }
    },
    [velocityThreshold, bufferSize, cooldownMs],
  );

  return { flapDetected, lastFlap, processLandmarks };
};

function calculateVelocity(buffer: number[]): number {
  if (buffer.length < 2) return 0;
  const oldest = buffer[0];
  const newest = buffer[buffer.length - 1];
  return (newest - oldest) / buffer.length;
}
