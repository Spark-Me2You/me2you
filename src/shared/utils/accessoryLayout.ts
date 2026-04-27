import type { Accessory } from "@/core/auth/AuthContext";

export type FaceAccessoryTuning = {
  widthFactor: number;
  offsetXFactor: number;
  offsetYFactor: number;
};

export type BalloonAccessoryTuning = {
  widthFactor: number;
  handXFactor: number;
  handYFactor: number;
  tiltRadians: number;
  stringEndU: number;
  stringEndV: number;
};

export type HubAccessoryTuning = {
  sunglasses: FaceAccessoryTuning;
  hat: FaceAccessoryTuning;
  balloon: BalloonAccessoryTuning;
};

export type AvatarAccessoryAnchor = "face" | "balloon-hand";

export type AccessoryPlacement = {
  anchor: AvatarAccessoryAnchor;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  baseRotation: number;
};

export type BalloonAnchorInput = {
  handX: number;
  handY: number;
  balloonWidth: number;
  balloonHeight: number;
  rotationRadians: number;
  userDeltaX?: number;
  userDeltaY?: number;
};

export const HUB_ACCESSORY_TUNING: HubAccessoryTuning = {
  sunglasses: {
    widthFactor: 0.8,
    offsetXFactor: 0,
    // Slightly above face center so lenses sit over the eyes.
    offsetYFactor: 0.03,
  },
  hat: {
    widthFactor: 0.6,
    offsetXFactor: 0,
    // Lift hat high enough that the brim lands near the top of the head.
    offsetYFactor: -0.46,
  },
  balloon: {
    widthFactor: 0.58,
    // Approximate right-hand attachment point on the mii body sprite.
    handXFactor: 0.33,
    handYFactor: 0.76,
    tiltRadians: 0.18,
    // String endpoint in balloon.svg viewBox space (x=27,y=94) mapped to [0,1].
    stringEndU: 0.45,
    stringEndV: 0.989,
  },
};

const PREVIEW_FACE_WIDTH_PERCENT = 45;
// Avatar-part constants shared by hub animation and static user previews.
export const HUB_MII_SIZE_FACTOR = 0.8;
export const MII_BODY_SCALE = 0.4 * HUB_MII_SIZE_FACTOR;
export const MII_FACE_SCALE = 0.35 * HUB_MII_SIZE_FACTOR;
export const MII_HEAD_OFFSET_X = 5 * HUB_MII_SIZE_FACTOR;
export const MII_HEAD_OFFSET_Y = -145 * HUB_MII_SIZE_FACTOR;

/**
 * Common denominator for converting preview-container-percent deltas into hub
 * Pixi pixels.  Both X and Y use face WIDTH as the reference so that equal
 * drag distances in the (square) 220 px preview map to equal proportional
 * movements relative to the face sprite in the hub, regardless of the face
 * image's actual aspect ratio.
 *
 * Usage in PixiHub:
 *   const px = faceW / HUB_DELTA_DENOMINATOR;
 *   userDeltaX = relativeX * px * HUB_DELTA_SCALE.x;
 *   userDeltaY = relativeY * px * HUB_DELTA_SCALE.y;
 */
export const HUB_DELTA_DENOMINATOR = PREVIEW_FACE_WIDTH_PERCENT; // = 45

/**
 * Per-axis scale multipliers applied on top of the base conversion.
 * Adjust these constants to fine-tune hub movement proportions without
 * touching the coordinate math.
 *
 * At 1.0 / 1.0 the accessory moves the same fraction of the hub face
 * sprite as it does in the 220 px preview container.
 */
export const HUB_DELTA_SCALE = {
  x: 0.9,
  y: 0.85,
} as const;

export function convertPreviewDeltaToHubPixels(
  faceWidth: number,
  relativeX: number = 0,
  relativeY: number = 0,
): { x: number; y: number } {
  const px = faceWidth / HUB_DELTA_DENOMINATOR;
  return {
    x: relativeX * px * HUB_DELTA_SCALE.x,
    y: relativeY * px * HUB_DELTA_SCALE.y,
  };
}

export function getAccessoryPlacement(input: {
  accessory: Accessory;
  faceWidth: number;
  faceHeight: number;
  accessoryAspectRatio: number;
  relativeX?: number;
  relativeY?: number;
  scale?: number;
}): AccessoryPlacement {
  const {
    accessory,
    faceWidth,
    faceHeight,
    accessoryAspectRatio,
    relativeX = 0,
    relativeY = 0,
    scale = 1,
  } = input;

  const userDelta = convertPreviewDeltaToHubPixels(faceWidth, relativeX, relativeY);

  if (accessory === "sunglasses") {
    const width = faceWidth * HUB_ACCESSORY_TUNING.sunglasses.widthFactor * scale;
    return {
      anchor: "face",
      width,
      height: width / accessoryAspectRatio,
      offsetX: faceWidth * HUB_ACCESSORY_TUNING.sunglasses.offsetXFactor + userDelta.x,
      offsetY: faceHeight * HUB_ACCESSORY_TUNING.sunglasses.offsetYFactor + userDelta.y,
      baseRotation: 0,
    };
  }

  if (accessory === "hat") {
    const width = faceWidth * HUB_ACCESSORY_TUNING.hat.widthFactor * scale;
    return {
      anchor: "face",
      width,
      height: width / accessoryAspectRatio,
      offsetX: faceWidth * HUB_ACCESSORY_TUNING.hat.offsetXFactor + userDelta.x,
      offsetY: faceHeight * HUB_ACCESSORY_TUNING.hat.offsetYFactor + userDelta.y,
      baseRotation: 0,
    };
  }

  const width = faceWidth * HUB_ACCESSORY_TUNING.balloon.widthFactor * scale;
  return {
    anchor: "balloon-hand",
    width,
    height: width / accessoryAspectRatio,
    // Stored and applied after hand-anchor solve for balloon.
    offsetX: userDelta.x,
    offsetY: userDelta.y,
    baseRotation: HUB_ACCESSORY_TUNING.balloon.tiltRadians,
  };
}

export function getBalloonCenterFromHandAnchor({
  handX,
  handY,
  balloonWidth,
  balloonHeight,
  rotationRadians,
  userDeltaX = 0,
  userDeltaY = 0,
}: BalloonAnchorInput): { x: number; y: number } {
  const stringEndDx = balloonWidth * (HUB_ACCESSORY_TUNING.balloon.stringEndU - 0.5);
  const stringEndDy = balloonHeight * (HUB_ACCESSORY_TUNING.balloon.stringEndV - 0.5);

  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);
  const rotatedDx = stringEndDx * cos - stringEndDy * sin;
  const rotatedDy = stringEndDx * sin + stringEndDy * cos;

  return {
    x: handX - rotatedDx + userDeltaX,
    y: handY - rotatedDy + userDeltaY,
  };
}
