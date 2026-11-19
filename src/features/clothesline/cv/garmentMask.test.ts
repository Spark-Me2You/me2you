import { describe, expect, it } from "vitest";
import {
  CATEGORY,
  clearNear,
  erode,
  extractGarments,
  largestComponent,
  poseCutLines,
  type PosePoint,
} from "./garmentMask";

const W = 100;
const H = 120;

/** Paint a rectangle (inclusive start, exclusive end) of one category. */
const paint = (
  categories: Uint8Array,
  category: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) => {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) categories[y * W + x] = category;
  }
};

/**
 * A stick person: hair 5-15, face 15-30, neck skin 30-34, shirt 34-70 with
 * bare forearms either side, trousers 70-110. The collar reaches up beside
 * the face, which the real model does for hoodies and scarves.
 */
const person = () => {
  const categories = new Uint8Array(W * H);
  paint(categories, CATEGORY.HAIR, 40, 5, 60, 15);
  paint(categories, CATEGORY.FACE_SKIN, 40, 15, 60, 30);
  paint(categories, CATEGORY.BODY_SKIN, 45, 30, 55, 34);
  paint(categories, CATEGORY.CLOTHES, 25, 34, 75, 70);
  paint(categories, CATEGORY.CLOTHES, 30, 20, 38, 34); // collar beside the face
  paint(categories, CATEGORY.BODY_SKIN, 15, 50, 25, 70); // forearm
  paint(categories, CATEGORY.BODY_SKIN, 75, 50, 85, 70); // forearm
  paint(categories, CATEGORY.CLOTHES, 30, 70, 70, 110);
  return categories;
};

const kept = (mask: Uint8Array) => {
  const indices: number[] = [];
  mask.forEach((value, i) => {
    if (value) indices.push(i);
  });
  return indices;
};

describe("extractGarments privacy rules", () => {
  it("keeps only pixels the model labelled as clothes", () => {
    const categories = person();
    const { top, bottom } = extractGarments({ categories, width: W, height: H, neckY: null, splitY: 70 });
    expect(top).not.toBeNull();
    expect(bottom).not.toBeNull();
    for (const piece of [top!, bottom!]) {
      for (const i of kept(piece.mask)) expect(categories[i]).toBe(CATEGORY.CLOTHES);
    }
  });

  it("keeps nothing on or above any row that contains face pixels", () => {
    const categories = person();
    const { top } = extractGarments({ categories, width: W, height: H, neckY: null, splitY: 70 });
    // Face ends at row 29, so the collar painted beside it (rows 20-33) is cut.
    expect(top!.bounds.yMin).toBeGreaterThan(29);
    for (const i of kept(top!.mask)) expect(Math.floor(i / W)).toBeGreaterThan(29);
  });

  it("keeps a gap between the garment and any skin, face or hair pixel", () => {
    const categories = person();
    const { top, bottom } = extractGarments({ categories, width: W, height: H, neckY: null, splitY: 70 });
    const person_ = [CATEGORY.HAIR, CATEGORY.BODY_SKIN, CATEGORY.FACE_SKIN] as number[];
    for (const piece of [top!, bottom!]) {
      for (const i of kept(piece.mask)) {
        const x = i % W;
        const y = Math.floor(i / W);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            expect(person_).not.toContain(categories[ny * W + nx]);
          }
        }
      }
    }
  });

  it("rejects the photo when there is no face and no pose to place the chin line", () => {
    const categories = new Uint8Array(W * H);
    paint(categories, CATEGORY.CLOTHES, 20, 10, 80, 100);
    const result = extractGarments({ categories, width: W, height: H, neckY: null, splitY: null });
    expect(result).toEqual({ top: null, bottom: null, reason: "no-chin-line" });
  });

  it("falls back to the pose neck line when the segmenter found no face", () => {
    const categories = new Uint8Array(W * H);
    paint(categories, CATEGORY.CLOTHES, 20, 10, 80, 100);
    const { top } = extractGarments({ categories, width: W, height: H, neckY: 40, splitY: null });
    expect(top!.bounds.yMin).toBeGreaterThanOrEqual(40);
  });

  it("prefers the segmenter's face over a pose neck line that sits too high", () => {
    const categories = person();
    const { top } = extractGarments({ categories, width: W, height: H, neckY: 2, splitY: 70 });
    expect(top!.bounds.yMin).toBeGreaterThan(29);
  });

  it("drops a second, smaller person and stray specks", () => {
    const categories = person();
    paint(categories, CATEGORY.CLOTHES, 88, 60, 98, 76); // bystander's shirt
    paint(categories, CATEGORY.CLOTHES, 2, 100, 4, 102); // speck
    const { top, bottom } = extractGarments({ categories, width: W, height: H, neckY: null, splitY: 70 });
    expect(top!.bounds.xMax).toBeLessThan(80);
    expect(bottom!.bounds.xMin).toBeGreaterThan(20);
  });

  it("reports no clothes when the only clothes are too small to be a garment", () => {
    const categories = new Uint8Array(W * H);
    paint(categories, CATEGORY.FACE_SKIN, 40, 15, 60, 30);
    paint(categories, CATEGORY.CLOTHES, 45, 60, 50, 65);
    const result = extractGarments({ categories, width: W, height: H, neckY: null, splitY: null });
    expect(result.reason).toBe("no-clothes");
    expect(result.top).toBeNull();
  });
});

describe("extractGarments top / bottom split", () => {
  it("splits at the hip line", () => {
    const { top, bottom } = extractGarments({
      categories: person(),
      width: W,
      height: H,
      neckY: null,
      splitY: 70,
    });
    expect(top!.bounds.yMax).toBeLessThan(70);
    expect(bottom!.bounds.yMin).toBeGreaterThanOrEqual(70);
  });

  it("keeps one top when the hips are out of frame", () => {
    const { top, bottom } = extractGarments({
      categories: person(),
      width: W,
      height: H,
      neckY: null,
      splitY: null,
    });
    expect(bottom).toBeNull();
    expect(top!.bounds.yMax).toBeGreaterThan(100);
  });

  it("hangs a lone piece below the hip line as a top", () => {
    const categories = new Uint8Array(W * H);
    paint(categories, CATEGORY.FACE_SKIN, 40, 5, 60, 20);
    paint(categories, CATEGORY.CLOTHES, 30, 60, 70, 110);
    const { top, bottom } = extractGarments({ categories, width: W, height: H, neckY: null, splitY: 50 });
    expect(bottom).toBeNull();
    expect(top!.bounds.yMin).toBeGreaterThanOrEqual(60);
  });
});

describe("mask helpers", () => {
  it("clearNear clears within the radius and no further", () => {
    const categories = new Uint8Array(W * H);
    categories[50 * W + 50] = CATEGORY.BODY_SKIN;
    const mask = new Uint8Array(W * H).fill(1);
    clearNear(mask, categories, W, H, [CATEGORY.BODY_SKIN], 2);
    expect(mask[50 * W + 50]).toBe(0);
    expect(mask[52 * W + 52]).toBe(0);
    expect(mask[48 * W + 48]).toBe(0);
    expect(mask[53 * W + 50]).toBe(1);
    expect(mask[50 * W + 47]).toBe(1);
  });

  it("clearNear handles blocked pixels on the frame edge", () => {
    const categories = new Uint8Array(W * H);
    categories[0] = CATEGORY.HAIR;
    categories[W * H - 1] = CATEGORY.HAIR;
    const mask = new Uint8Array(W * H).fill(1);
    clearNear(mask, categories, W, H, [CATEGORY.HAIR], 1);
    expect(mask[0]).toBe(0);
    expect(mask[W + 1]).toBe(0);
    expect(mask[W * H - 1]).toBe(0);
    expect(mask[2 * W + 2]).toBe(1);
  });

  it("erode trims one pixel from every edge", () => {
    const mask = new Uint8Array(W * H);
    for (let y = 10; y < 20; y++) for (let x = 10; x < 20; x++) mask[y * W + x] = 1;
    const out = erode(mask, W, H);
    expect(out[10 * W + 10]).toBe(0);
    expect(out[11 * W + 11]).toBe(1);
    expect(out[18 * W + 18]).toBe(1);
    expect(out[19 * W + 19]).toBe(0);
  });

  it("largestComponent returns the biggest piece and its bounds", () => {
    const mask = new Uint8Array(W * H);
    for (let y = 10; y < 14; y++) for (let x = 10; x < 14; x++) mask[y * W + x] = 1;
    for (let y = 40; y < 60; y++) for (let x = 40; x < 60; x++) mask[y * W + x] = 1;
    const piece = largestComponent(mask, W, H)!;
    expect(piece.area).toBe(400);
    expect(piece.bounds).toEqual({ xMin: 40, yMin: 40, xMax: 59, yMax: 59 });
    expect(piece.mask[10 * W + 10]).toBe(0);
  });

  it("largestComponent does not cross its row range", () => {
    const mask = new Uint8Array(W * H);
    for (let y = 10; y < 60; y++) for (let x = 40; x < 60; x++) mask[y * W + x] = 1;
    const piece = largestComponent(mask, W, H, 0, 30)!;
    expect(piece.bounds.yMax).toBe(29);
    expect(piece.area).toBe(20 * 20);
    expect(largestComponent(new Uint8Array(W * H), W, H)).toBeNull();
  });
});

describe("poseCutLines", () => {
  const pose = (overrides: Record<number, PosePoint> = {}): PosePoint[] => {
    const points: PosePoint[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
    points[11] = { x: 0.6, y: 0.3, visibility: 0.9 };
    points[12] = { x: 0.4, y: 0.3, visibility: 0.9 };
    points[23] = { x: 0.56, y: 0.6, visibility: 0.9 };
    points[24] = { x: 0.44, y: 0.6, visibility: 0.9 };
    for (const [index, point] of Object.entries(overrides)) points[Number(index)] = point;
    return points;
  };

  it("puts the neck above the shoulders and the split just below the hips", () => {
    const { neckY, splitY } = poseCutLines(pose(), 100, 200);
    expect(neckY).toBeCloseTo(60 - 20 * 0.12);
    expect(splitY).toBeCloseTo(120 + 60 * 0.1);
  });

  it("returns nothing without visible shoulders", () => {
    expect(poseCutLines(undefined, 100, 200)).toEqual({ neckY: null, splitY: null });
    expect(poseCutLines(pose({ 11: { x: 0.6, y: 0.3, visibility: 0.1 } }), 100, 200)).toEqual({
      neckY: null,
      splitY: null,
    });
  });

  it("skips the split when the hips are hidden or below the frame", () => {
    expect(poseCutLines(pose({ 23: { x: 0.56, y: 0.6, visibility: 0.2 } }), 100, 200).splitY).toBeNull();
    expect(poseCutLines(pose({ 24: { x: 0.44, y: 1.2, visibility: 0.9 } }), 100, 200).splitY).toBeNull();
  });
});
