/**
 * Fake MediaPipe tasks
 * Swapped in for `src/core/cv/mediapipe-loader.ts` and
 * `src/core/cv/cursor/handLandmarkerLoader.ts`. Each task answers from the
 * simulated input store instead of running a model on the camera frame.
 */

import type {
  GestureRecognizer,
  GestureRecognizerResult,
  HandLandmarker,
  HandLandmarkerResult,
  PoseLandmarker,
  PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';
import { handLandmarks, poseLandmarks, sim } from '../sim/simInput';

const noop = () => {};

function category(categoryName: string, score = 0.92) {
  return { categoryName, displayName: categoryName, score, index: 0 };
}

export const createGestureRecognizer = async (): Promise<GestureRecognizer> => {
  const recognizeForVideo = (): GestureRecognizerResult => {
    const landmarks = handLandmarks();
    if (!sim.gesture) {
      return { gestures: [], handedness: [], handednesses: [], landmarks: [], worldLandmarks: [] };
    }
    return {
      gestures: [[category(sim.gesture)]],
      handedness: [[category('Right')]],
      handednesses: [[category('Right')]],
      landmarks: landmarks ? [landmarks] : [],
      worldLandmarks: [],
    };
  };
  return { recognizeForVideo, recognize: recognizeForVideo, close: noop } as unknown as GestureRecognizer;
};

export const createPoseLandmarker = async (): Promise<PoseLandmarker> => {
  const detectForVideo = (): PoseLandmarkerResult =>
    ({ landmarks: poseLandmarks(), worldLandmarks: [], segmentationMasks: [] }) as unknown as PoseLandmarkerResult;
  return { detectForVideo, detect: detectForVideo, close: noop } as unknown as PoseLandmarker;
};

export const createHandLandmarker = async (): Promise<HandLandmarker> => {
  const detectForVideo = (): HandLandmarkerResult => {
    const landmarks = handLandmarks();
    return {
      landmarks: landmarks ? [landmarks] : [],
      worldLandmarks: [],
      handedness: landmarks ? [[category('Right')]] : [],
      handednesses: landmarks ? [[category('Right')]] : [],
    };
  };
  return { detectForVideo, close: noop } as unknown as HandLandmarker;
};

export const closeHandLandmarker = noop;

const unsupported = (name: string) => async () => {
  throw new Error(`[ladle] ${name} is not simulated; mock the service that uses it`);
};

export const loadMediaPipeVision = unsupported('loadMediaPipeVision');
export const createFaceDetector = unsupported('createFaceDetector');
export const createImageSegmenter = unsupported('createImageSegmenter');
export const createFaceLandmarker = unsupported('createFaceLandmarker');
