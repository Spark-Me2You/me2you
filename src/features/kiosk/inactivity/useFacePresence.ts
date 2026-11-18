/**
 * Face presence — runs MediaPipe FaceDetector (BlazeFace short range) on the shared
 * kiosk camera at a low rate and records when a screen-facing face was last seen.
 *
 * Reads the stream from SharedCameraProvider into its own off-DOM <video>; it never
 * opens the camera itself. The result lives in a ref so polling it doesn't re-render.
 */

import { useEffect, useRef } from "react";
import type { FaceDetector } from "@mediapipe/tasks-vision";
import { useSharedCamera } from "@/core/cv/SharedCameraProvider";
import { createFaceDetector } from "@/core/cv/mediapipe-loader";
import { faceDetectorConfig } from "@/core/cv/face-detector-config";
import { isFacingScreen } from "./faceFacing";

/** ~3 fps is plenty for presence and keeps the second model cheap next to hand tracking. */
const DETECT_INTERVAL_MS = 330;

export function useFacePresence(enabled: boolean): React.RefObject<number | null> {
  const { stream } = useSharedCamera();
  const lastFaceAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !stream) return;

    let cancelled = false;
    let detector: FaceDetector | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    video.play().catch(() => {
      // Muted inline playback is allowed; ignore the rare interrupted-play rejection.
    });

    const tick = () => {
      if (cancelled) return;
      if (detector && video.readyState >= 2) {
        try {
          const now = performance.now();
          const { detections } = detector.detectForVideo(video, now);
          if (detections.some((d) => isFacingScreen(d, video.videoWidth))) {
            lastFaceAtRef.current = now;
          }
        } catch (err) {
          console.warn("[useFacePresence] detection failed:", err);
        }
      }
      timer = setTimeout(tick, DETECT_INTERVAL_MS);
    };

    createFaceDetector({ ...faceDetectorConfig, runningMode: "VIDEO" })
      .then((d) => {
        if (cancelled) {
          d.close();
          return;
        }
        detector = d;
      })
      .catch((err) => console.error("[useFacePresence] failed to load FaceDetector:", err));

    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      detector?.close();
      video.srcObject = null;
      lastFaceAtRef.current = null;
    };
  }, [enabled, stream]);

  return lastFaceAtRef;
}
