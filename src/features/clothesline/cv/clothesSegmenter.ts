/**
 * Clothes segmenter
 * Runs the selfie_multiclass segmenter and the pose landmarker on one captured
 * frame and returns clothing cutouts. The frame lives in an in-memory canvas
 * for the length of this call and is never stored, uploaded or returned.
 */

import type { ImageSegmenter, PoseLandmarker } from "@mediapipe/tasks-vision";
import {
  createImageSegmenter,
  createPoseLandmarker,
  imageSegmenterConfig,
  poseLandmarkerConfig,
} from "@/core/cv";
import { CLOTHESLINE_CONFIG } from "../config/clotheslineConfig";
import type { CapturedGarment, GarmentKind } from "../types";
import { cutOutGarment } from "./garmentCutout";
import {
  extractGarments,
  poseCutLines,
  type GarmentMask,
  type RejectReason,
} from "./garmentMask";

export interface SegmentResult {
  garments: CapturedGarment[];
  /** Why nothing came back, when `garments` is empty. */
  reason: RejectReason | null;
}

let segmenterPromise: Promise<ImageSegmenter> | null = null;
let posePromise: Promise<PoseLandmarker> | null = null;

const getSegmenter = () => {
  segmenterPromise ??= createImageSegmenter({
    ...imageSegmenterConfig,
    outputConfidenceMasks: false,
  }).catch((error) => {
    segmenterPromise = null;
    throw error;
  });
  return segmenterPromise;
};

const getPose = () => {
  posePromise ??= createPoseLandmarker({
    ...poseLandmarkerConfig,
    runningMode: "IMAGE",
  }).catch((error) => {
    posePromise = null;
    throw error;
  });
  return posePromise;
};

/** Start loading both models so the first photo isn't slow. */
export function warmUpClothesSegmenter(): void {
  void getSegmenter().catch(() => {});
  void getPose().catch(() => {});
}

/** Free both models (call when leaving the clothesline). */
export function disposeClothesSegmenter(): void {
  const segmenter = segmenterPromise;
  const pose = posePromise;
  segmenterPromise = null;
  posePromise = null;
  void segmenter?.then((s) => s.close()).catch(() => {});
  void pose?.then((p) => p.close()).catch(() => {});
}

/** Draw the current video frame, un-mirrored, onto a work-sized canvas. */
export function captureFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const { videoWidth, videoHeight } = video;
  if (!videoWidth || !videoHeight) throw new Error("The camera isn't ready yet");
  const scale = Math.min(1, CLOTHESLINE_CONFIG.workSize / Math.max(videoWidth, videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(videoWidth * scale);
  canvas.height = Math.round(videoHeight * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not read the camera frame");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Stretch a category mask to the frame size (nearest neighbour). */
export function resizeCategories(
  source: Uint8Array,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
): Uint8Array {
  if (sourceWidth === width && sourceHeight === height) return source.slice();
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const sy = Math.min(sourceHeight - 1, Math.floor((y * sourceHeight) / height));
    for (let x = 0; x < width; x++) {
      const sx = Math.min(sourceWidth - 1, Math.floor((x * sourceWidth) / width));
      out[y * width + x] = source[sy * sourceWidth + sx];
    }
  }
  return out;
}

/**
 * Find the clothes in a captured frame. The frame canvas is wiped before this
 * returns, whatever happens.
 */
export async function segmentClothes(frame: HTMLCanvasElement): Promise<SegmentResult> {
  try {
    const [segmenter, pose] = await Promise.all([getSegmenter(), getPose()]);
    const { width, height } = frame;

    const segmentation = segmenter.segment(frame);
    const categoryMask = segmentation.categoryMask;
    if (!categoryMask) {
      segmentation.close();
      throw new Error("The clothes model returned no mask");
    }
    const categories = resizeCategories(
      categoryMask.getAsUint8Array(),
      categoryMask.width,
      categoryMask.height,
      width,
      height,
    );
    segmentation.close();

    const poseResult = pose.detect(frame);
    const { neckY, splitY } = poseCutLines(poseResult.landmarks[0], width, height);
    poseResult.close();

    const { top, bottom, reason } = extractGarments({ categories, width, height, neckY, splitY });

    const garments: CapturedGarment[] = [];
    const pieces: [GarmentKind, GarmentMask | null][] = [
      ["top", top],
      ["bottom", bottom],
    ];
    for (const [kind, piece] of pieces) {
      if (!piece) continue;
      const cutout = await cutOutGarment(frame, piece);
      garments.push({ kind, ...cutout, previewUrl: URL.createObjectURL(cutout.blob) });
    }
    return { garments, reason: garments.length ? null : (reason ?? "no-clothes") };
  } finally {
    // Drop the photo: shrinking a canvas clears its pixels.
    frame.width = 0;
    frame.height = 0;
  }
}
