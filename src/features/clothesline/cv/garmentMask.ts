/**
 * Garment masks
 * Pure pixel logic that turns a selfie_multiclass category mask into "top" and
 * "bottom" clothing masks. No canvas or MediaPipe here, so the privacy rules
 * below are unit tested (garmentMask.test.ts).
 *
 * Privacy rules, applied in this order:
 *  1. Only pixels the model labels as clothes are ever kept. Face, hair, body
 *     skin, held objects and the room are dropped by construction.
 *  2. Everything above the chin line is dropped, so no row of the photo that
 *     contains a face can contribute a pixel.
 *  3. Clothes pixels touching face, hair or skin are dropped (the model's
 *     class borders are soft, and those fringes are where skin leaks in).
 *  4. Only the largest connected piece survives, which removes specks and
 *     other people standing in the background.
 * If no chin line can be established the photo is rejected outright.
 */

/** selfie_multiclass_256x256 category indices. */
export const CATEGORY = {
  BACKGROUND: 0,
  HAIR: 1,
  BODY_SKIN: 2,
  FACE_SKIN: 3,
  CLOTHES: 4,
  OTHERS: 5,
} as const;

const PERSON_PIXELS: readonly number[] = [
  CATEGORY.HAIR,
  CATEGORY.BODY_SKIN,
  CATEGORY.FACE_SKIN,
];

/** Inclusive pixel bounds. */
export interface MaskBounds {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export interface GarmentMask {
  /** 1 where the garment is, 0 elsewhere; `width * height` long. */
  mask: Uint8Array;
  bounds: MaskBounds;
  area: number;
}

export type RejectReason = "no-chin-line" | "no-clothes";

export interface ExtractResult {
  top: GarmentMask | null;
  bottom: GarmentMask | null;
  /** Set when nothing usable was found. */
  reason: RejectReason | null;
}

export interface ExtractInput {
  categories: Uint8Array;
  width: number;
  height: number;
  /**
   * Row just below the face from pose landmarks, used when the segmenter
   * found no face pixels (head turned away or cropped). Null if unknown.
   */
  neckY: number | null;
  /** Row dividing top from bottom (hip line). Null keeps everything as a top. */
  splitY: number | null;
}

/** Share of the frame a piece must cover to count as a garment. */
export const MIN_AREA_FRACTION = 0.012;
/** Rows kept clear below the lowest face pixel, as a share of frame height. */
export const CHIN_MARGIN_FRACTION = 0.01;
/** How far clothes must stay from face, hair and skin, as a share of frame width. */
export const SKIN_GUARD_FRACTION = 0.008;

export function boundsOfCategory(
  categories: Uint8Array,
  width: number,
  height: number,
  category: number,
): MaskBounds | null {
  let xMin = width;
  let yMin = height;
  let xMax = -1;
  let yMax = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (categories[row + x] !== category) continue;
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
  }
  return xMax < 0 ? null : { xMin, yMin, xMax, yMax };
}

/** Zero every mask pixel within `radius` (square neighbourhood) of a blocked category. */
export function clearNear(
  mask: Uint8Array,
  categories: Uint8Array,
  width: number,
  height: number,
  blocked: readonly number[],
  radius: number,
): void {
  const size = width * height;
  const isBlocked = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    if (blocked.includes(categories[i])) isBlocked[i] = 1;
  }

  // Dilate the blocked map: rows first, then columns.
  const rows = new Uint8Array(size);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let count = 0;
    for (let x = 0; x < Math.min(radius, width); x++) count += isBlocked[row + x];
    for (let x = 0; x < width; x++) {
      const entering = x + radius;
      if (entering < width) count += isBlocked[row + entering];
      const leaving = x - radius - 1;
      if (leaving >= 0) count -= isBlocked[row + leaving];
      if (count > 0) rows[row + x] = 1;
    }
  }
  for (let x = 0; x < width; x++) {
    let count = 0;
    for (let y = 0; y < Math.min(radius, height); y++) count += rows[y * width + x];
    for (let y = 0; y < height; y++) {
      const entering = y + radius;
      if (entering < height) count += rows[entering * width + x];
      const leaving = y - radius - 1;
      if (leaving >= 0) count -= rows[leaving * width + x];
      if (count > 0) mask[y * width + x] = 0;
    }
  }
}

/** Shrink the mask by one pixel so background-coloured edge pixels are dropped. */
export function erode(mask: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const i = row + x;
      if (mask[i] && mask[i - 1] && mask[i + 1] && mask[i - width] && mask[i + width]) out[i] = 1;
    }
  }
  return out;
}

/** The biggest 4-connected piece of the mask within rows [yStart, yEnd). */
export function largestComponent(
  mask: Uint8Array,
  width: number,
  height: number,
  yStart = 0,
  yEnd = height,
): GarmentMask | null {
  const from = Math.max(0, yStart);
  const to = Math.min(height, yEnd);
  const labels = new Int32Array(width * height);
  const stack = new Int32Array(width * height);
  let best: { label: number; area: number; bounds: MaskBounds } | null = null;
  let label = 0;

  for (let start = from * width; start < to * width; start++) {
    if (!mask[start] || labels[start]) continue;
    label++;
    let top = 0;
    stack[top++] = start;
    labels[start] = label;
    let area = 0;
    const bounds: MaskBounds = { xMin: width, yMin: height, xMax: -1, yMax: -1 };

    while (top > 0) {
      const i = stack[--top];
      const x = i % width;
      const y = (i - x) / width;
      area++;
      if (x < bounds.xMin) bounds.xMin = x;
      if (x > bounds.xMax) bounds.xMax = x;
      if (y < bounds.yMin) bounds.yMin = y;
      if (y > bounds.yMax) bounds.yMax = y;

      if (x > 0 && mask[i - 1] && !labels[i - 1]) {
        labels[i - 1] = label;
        stack[top++] = i - 1;
      }
      if (x < width - 1 && mask[i + 1] && !labels[i + 1]) {
        labels[i + 1] = label;
        stack[top++] = i + 1;
      }
      if (y > from && mask[i - width] && !labels[i - width]) {
        labels[i - width] = label;
        stack[top++] = i - width;
      }
      if (y < to - 1 && mask[i + width] && !labels[i + width]) {
        labels[i + width] = label;
        stack[top++] = i + width;
      }
    }

    if (!best || area > best.area) best = { label, area, bounds };
  }

  if (!best) return null;
  const out = new Uint8Array(mask.length);
  for (let i = from * width; i < to * width; i++) {
    if (labels[i] === best.label) out[i] = 1;
  }
  return { mask: out, bounds: best.bounds, area: best.area };
}

/**
 * Build the top and bottom garment masks for one photo. See the privacy rules
 * at the top of this file.
 */
export function extractGarments(input: ExtractInput): ExtractResult {
  const { categories, width, height, neckY, splitY } = input;
  const size = width * height;

  // Rule 2: find the chin line. The segmenter's own face pixels win; the pose
  // estimate only stands in when there are none.
  const face = boundsOfCategory(categories, width, height, CATEGORY.FACE_SKIN);
  const chinMargin = Math.ceil(height * CHIN_MARGIN_FRACTION);
  const chinY = face ? face.yMax + 1 + chinMargin : neckY === null ? null : Math.ceil(neckY);
  if (chinY === null) return { top: null, bottom: null, reason: "no-chin-line" };

  // Rule 1 + 2: clothes pixels below the chin line only.
  const clothes = new Uint8Array(size);
  for (let i = Math.max(0, chinY) * width; i < size; i++) {
    if (categories[i] === CATEGORY.CLOTHES) clothes[i] = 1;
  }

  // Rule 3.
  const guard = Math.max(1, Math.round(width * SKIN_GUARD_FRACTION));
  clearNear(clothes, categories, width, height, PERSON_PIXELS, guard);
  const mask = erode(clothes, width, height);

  // Rule 4, per half.
  const minArea = size * MIN_AREA_FRACTION;
  const divide =
    splitY === null ? height : Math.min(height, Math.max(chinY, Math.round(splitY)));
  const keep = (piece: GarmentMask | null) => (piece && piece.area >= minArea ? piece : null);
  let top = keep(largestComponent(mask, width, height, 0, divide));
  let bottom = keep(largestComponent(mask, width, height, divide, height));

  // A hip line with nothing above it means the split was wrong (e.g. a dress
  // read as all "bottom"): hang the one piece as a top instead.
  if (!top && bottom) {
    top = keep(largestComponent(mask, width, height));
    bottom = null;
  }

  return { top, bottom, reason: top ? null : "no-clothes" };
}

/** A pose landmark in normalized image coordinates. */
export interface PosePoint {
  x: number;
  y: number;
  visibility?: number;
}

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const MIN_VISIBILITY = 0.5;
/** Shirts hang a little below the hip joints. */
const HEM_BELOW_HIPS = 0.1;
/** The neck fallback sits this share of the shoulder width above the shoulders. */
const NECK_ABOVE_SHOULDERS = 0.12;

const seen = (point: PosePoint | undefined): point is PosePoint =>
  !!point && (point.visibility ?? 1) >= MIN_VISIBILITY && point.y >= 0 && point.y <= 1;

/**
 * Rows (in pixels) used to cut the photo: `neckY` backs up the chin line and
 * `splitY` divides top from bottom. Either is null when the joints aren't visible.
 */
export function poseCutLines(
  landmarks: readonly PosePoint[] | undefined,
  width: number,
  height: number,
): { neckY: number | null; splitY: number | null } {
  const ls = landmarks?.[LEFT_SHOULDER];
  const rs = landmarks?.[RIGHT_SHOULDER];
  if (!seen(ls) || !seen(rs)) return { neckY: null, splitY: null };

  const shoulderY = ((ls.y + rs.y) / 2) * height;
  const shoulderWidth = Math.abs(ls.x - rs.x) * width;
  const neckY = Math.max(0, shoulderY - shoulderWidth * NECK_ABOVE_SHOULDERS);

  const lh = landmarks?.[LEFT_HIP];
  const rh = landmarks?.[RIGHT_HIP];
  if (!seen(lh) || !seen(rh)) return { neckY, splitY: null };

  const hipY = ((lh.y + rh.y) / 2) * height;
  const torso = hipY - shoulderY;
  if (torso <= 0) return { neckY, splitY: null };
  return { neckY, splitY: hipY + torso * HEM_BELOW_HIPS };
}
