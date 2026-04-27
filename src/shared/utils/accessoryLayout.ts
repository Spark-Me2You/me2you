import type { Accessory } from "@/core/auth/AuthContext";

type FaceAccessoryTuning = {
  widthFactor: number;
  offsetXFactor: number;
  offsetYFactor: number;
};

type BalloonAccessoryTuning = {
  widthFactor: number;
  handXFactor: number;
  handYFactor: number;
  tiltRadians: number;
  stringEndU: number;
  stringEndV: number;
};

type HubAccessoryTuning = {
  sunglasses: FaceAccessoryTuning;
  hat: FaceAccessoryTuning;
  balloon: BalloonAccessoryTuning;
};

type UserPreviewAccessoryCalibration = {
  // Positive X moves accessory right in preview space.
  xPercent: number;
  // Positive Y moves accessory down in preview space.
  yPercent: number;
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

// Per-accessory calibration offsets for user mii previews.
// Keep hub tuning unchanged; use these to fine-tune preview parity.
export const USER_MII_ACCESSORY_CALIBRATION: Record<
  Accessory,
  UserPreviewAccessoryCalibration
> = {
  sunglasses: { xPercent: 0, yPercent: 11 },
  hat: { xPercent: 0, yPercent: 0 },
  balloon: { xPercent: 0, yPercent: 0 },
};

const PREVIEW_FACE_TOP_PERCENT = 8;
const PREVIEW_FACE_WIDTH_PERCENT = 45;
const PREVIEW_FACE_ASPECT_RATIO = 0.78;
const PREVIEW_BODY_HEIGHT_PERCENT = 45;
const PREVIEW_BODY_ASPECT_RATIO = 325 / 250;
const PREVIEW_BODY_CENTER_X_PERCENT = 50;
const PREVIEW_STAGE_BOTTOM_PERCENT = 100;

const ACCESSORY_ASPECT_RATIO: Record<Accessory, number> = {
  sunglasses: 120 / 40,
  hat: 80 / 90,
  balloon: 60 / 95,
};

const toPercent = (value: number): string => `${value.toFixed(2)}%`;
const toDegrees = (radians: number): string =>
  `${((radians * 180) / Math.PI).toFixed(2)}deg`;

const getFaceAccessoryPreviewLayout = (
  tuning: FaceAccessoryTuning,
  accessoryAspectRatio: number,
  calibration: UserPreviewAccessoryCalibration,
) => {
  const faceHeightPercent =
    PREVIEW_FACE_WIDTH_PERCENT * PREVIEW_FACE_ASPECT_RATIO;
  const accessoryWidthPercent = PREVIEW_FACE_WIDTH_PERCENT * tuning.widthFactor;
  const accessoryHeightPercent = accessoryWidthPercent / accessoryAspectRatio;

  const accessoryCenterXPercent =
    PREVIEW_BODY_CENTER_X_PERCENT +
    PREVIEW_FACE_WIDTH_PERCENT * tuning.offsetXFactor;
  const accessoryCenterYPercent =
    PREVIEW_FACE_TOP_PERCENT + faceHeightPercent * (0.5 + tuning.offsetYFactor);

  return {
    leftPercent: accessoryCenterXPercent + calibration.xPercent,
    topPercent:
      accessoryCenterYPercent -
      accessoryHeightPercent / 2 +
      calibration.yPercent,
    widthPercent: accessoryWidthPercent,
  };
};

const getBalloonPreviewLayout = (
  tuning: BalloonAccessoryTuning,
  calibration: UserPreviewAccessoryCalibration,
) => {
  const bodyWidthPercent =
    PREVIEW_BODY_HEIGHT_PERCENT * PREVIEW_BODY_ASPECT_RATIO;
  const balloonWidthPercent = PREVIEW_FACE_WIDTH_PERCENT * tuning.widthFactor;
  const balloonHeightPercent =
    balloonWidthPercent / ACCESSORY_ASPECT_RATIO.balloon;

  const handXPercent =
    PREVIEW_BODY_CENTER_X_PERCENT + bodyWidthPercent * tuning.handXFactor;
  const handYPercent =
    PREVIEW_STAGE_BOTTOM_PERCENT -
    PREVIEW_BODY_HEIGHT_PERCENT * tuning.handYFactor;

  // Position balloon by anchoring its string endpoint to the hand, matching hub logic.
  const stringEndDx = balloonWidthPercent * (tuning.stringEndU - 0.5);
  const stringEndDy = balloonHeightPercent * (tuning.stringEndV - 0.5);
  const cos = Math.cos(tuning.tiltRadians);
  const sin = Math.sin(tuning.tiltRadians);
  const rotatedDx = stringEndDx * cos - stringEndDy * sin;
  const rotatedDy = stringEndDx * sin + stringEndDy * cos;

  const balloonCenterXPercent = handXPercent - rotatedDx;
  const balloonCenterYPercent = handYPercent - rotatedDy;

  return {
    topPercent:
      balloonCenterYPercent - balloonHeightPercent / 2 + calibration.yPercent,
    rightPercent:
      100 -
      (balloonCenterXPercent + balloonWidthPercent / 2) -
      calibration.xPercent,
    widthPercent: balloonWidthPercent,
  };
};

const sunglassesPreview = getFaceAccessoryPreviewLayout(
  HUB_ACCESSORY_TUNING.sunglasses,
  ACCESSORY_ASPECT_RATIO.sunglasses,
  USER_MII_ACCESSORY_CALIBRATION.sunglasses,
);
const hatPreview = getFaceAccessoryPreviewLayout(
  HUB_ACCESSORY_TUNING.hat,
  ACCESSORY_ASPECT_RATIO.hat,
  USER_MII_ACCESSORY_CALIBRATION.hat,
);
const balloonPreview = getBalloonPreviewLayout(
  HUB_ACCESSORY_TUNING.balloon,
  USER_MII_ACCESSORY_CALIBRATION.balloon,
);

// CSS variables consumed by both user-facing mii preview surfaces:
// - CustomizeAvatarView (edit avatar)
// - UserProfileView (top "my mii" tab)
export const USER_MII_ACCESSORY_CSS_VARS = {
  "--acc-sunglasses-left": toPercent(sunglassesPreview.leftPercent),
  "--acc-sunglasses-top": toPercent(sunglassesPreview.topPercent),
  "--acc-sunglasses-width": toPercent(sunglassesPreview.widthPercent),
  "--acc-hat-left": toPercent(hatPreview.leftPercent),
  "--acc-hat-top": toPercent(hatPreview.topPercent),
  "--acc-hat-width": toPercent(hatPreview.widthPercent),
  "--acc-balloon-top": toPercent(balloonPreview.topPercent),
  "--acc-balloon-right": toPercent(balloonPreview.rightPercent),
  "--acc-balloon-width": toPercent(balloonPreview.widthPercent),
  "--acc-balloon-tilt": toDegrees(HUB_ACCESSORY_TUNING.balloon.tiltRadians),
} as const;

/**
 * Returns CSS variable overrides for a single accessory with optional user
 * placement adjustments applied on top of the baseline tuning.
 *
 * @param accessory - Which accessory to render (null → return baseline vars unchanged)
 * @param relativeX - Horizontal delta in percentage points of the 220px preview
 *                    container. Positive moves right. Range [-40, 40].
 * @param relativeY - Vertical delta in percentage points of the 220px preview
 *                    container. Positive moves down. Range [-40, 40].
 * @param scale     - Width scale multiplier applied on top of baseline. Range [0.5, 2.0].
 */
export function computeUserMiiAccessoryCssVars(
  accessory: Accessory | null,
  relativeX: number = 0,
  relativeY: number = 0,
  scale: number = 1,
): Record<string, string> {
  const vars: Record<string, string> = { ...USER_MII_ACCESSORY_CSS_VARS };

  if (!accessory) return vars;

  if (accessory === "sunglasses") {
    vars["--acc-sunglasses-left"] = toPercent(
      sunglassesPreview.leftPercent + relativeX,
    );
    vars["--acc-sunglasses-top"] = toPercent(
      sunglassesPreview.topPercent + relativeY,
    );
    vars["--acc-sunglasses-width"] = toPercent(
      sunglassesPreview.widthPercent * scale,
    );
  } else if (accessory === "hat") {
    vars["--acc-hat-left"] = toPercent(hatPreview.leftPercent + relativeX);
    vars["--acc-hat-top"] = toPercent(hatPreview.topPercent + relativeY);
    vars["--acc-hat-width"] = toPercent(hatPreview.widthPercent * scale);
  } else if (accessory === "balloon") {
    vars["--acc-balloon-top"] = toPercent(
      balloonPreview.topPercent + relativeY,
    );
    // Positive relX = move right = decrease the CSS `right` value.
    vars["--acc-balloon-right"] = toPercent(
      balloonPreview.rightPercent - relativeX,
    );
    vars["--acc-balloon-width"] = toPercent(
      balloonPreview.widthPercent * scale,
    );
  }

  return vars;
}

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
};
