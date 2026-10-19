/**
 * Fake face crop service
 * Swapped in for `src/features/registration/services/faceCropService.ts`.
 * Returns a generated bobblehead with fixed landmarks instead of running
 * segmentation; `sim.face = false` makes it report no face.
 */

import type { CropResult } from '@/features/registration/services/faceCropService';
import { HEAD_LANDMARKS, placeholderHeadBlob } from '../fixtures/images';
import { sim } from '../sim/simInput';

export type {
  CropMetadata,
  CropOptions,
  CropResult,
  FaceBoundingBox,
  FaceLandmarks,
  HeadBounds,
} from '@/features/registration/services/faceCropService';

export class FaceNotDetectedError extends Error {
  constructor(message = 'No face detected in photo') {
    super(message);
    this.name = 'FaceNotDetectedError';
  }
}

let ready = false;

const cropFace = async (blob: Blob): Promise<CropResult> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (!sim.face) throw new FaceNotDetectedError();
  return {
    originalBlob: blob,
    croppedBlob: await placeholderHeadBlob(),
    cropMetadata: {
      faceDetected: true,
      headBounds: { xMin: 112, yMin: 170, xMax: 368, yMax: 426, width: 256, height: 256 },
      boundingBox: { x: 0.23, y: 0.27, width: 0.53, height: 0.4 },
      confidence: 0.97,
      outputSize: { width: 256, height: 256 },
      padding: 0.08,
      processingTimeMs: 300,
      landmarks: HEAD_LANDMARKS,
      segmentationMaskUsed: true,
    },
  };
};

export const faceCropService = {
  initialize: async () => {
    ready = true;
  },
  isReady: () => ready,
  cropFace,
  dispose: () => {
    ready = false;
  },
};
