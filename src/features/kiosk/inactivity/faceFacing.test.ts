import { describe, it, expect } from "vitest";
import { isFacingScreen } from "./faceFacing";

const FRAME_W = 1280;

function face(noseX: number, width = 200) {
  return {
    boundingBox: { width },
    keypoints: [
      { x: 0.45, y: 0.4 }, // right eye
      { x: 0.55, y: 0.4 }, // left eye
      { x: noseX, y: 0.45 }, // nose
    ],
  };
}

describe("isFacingScreen", () => {
  it("accepts a head-on face", () => {
    expect(isFacingScreen(face(0.5), FRAME_W)).toBe(true);
  });

  it("accepts a slight turn", () => {
    expect(isFacingScreen(face(0.53), FRAME_W)).toBe(true);
  });

  it("rejects a face turned away", () => {
    expect(isFacingScreen(face(0.56), FRAME_W)).toBe(false);
    expect(isFacingScreen(face(0.44), FRAME_W)).toBe(false);
  });

  it("rejects a face too small (far away)", () => {
    expect(isFacingScreen(face(0.5, 40), FRAME_W)).toBe(false);
  });

  it("rejects detections missing a box or keypoints", () => {
    expect(isFacingScreen({ keypoints: face(0.5).keypoints }, FRAME_W)).toBe(false);
    expect(isFacingScreen({ boundingBox: { width: 200 }, keypoints: [] }, FRAME_W)).toBe(false);
    expect(isFacingScreen(face(0.5), 0)).toBe(false);
  });
});
