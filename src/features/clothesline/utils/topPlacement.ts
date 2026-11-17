import { MII_TOP_FIT } from "../config/clotheslineConfig";

export interface TopPlacement {
  width: number;
  height: number;
  /** Distance from the body sprite's feet (bottom edge) up to the top of the garment. */
  topAboveFeet: number;
}

/**
 * Size and position of a worn top on the mii body sprite: the largest size
 * that fits the torso box, hung from the shoulder line and centred.
 *
 * @param bodyWidth   Displayed width of the body sprite.
 * @param bodyHeight  Displayed height of the body sprite.
 * @param aspect      Garment image width / height.
 */
export function getTopPlacement(bodyWidth: number, bodyHeight: number, aspect: number): TopPlacement {
  const maxWidth = bodyWidth * MII_TOP_FIT.maxWidthFactor;
  const maxHeight = bodyHeight * MII_TOP_FIT.maxHeightFactor;
  const safeAspect = aspect > 0 && Number.isFinite(aspect) ? aspect : 1;
  const width = Math.min(maxWidth, maxHeight * safeAspect);
  return {
    width,
    height: width / safeAspect,
    topAboveFeet: bodyHeight * (1 - MII_TOP_FIT.shoulderYFactor),
  };
}

/** Load a garment image as an element; works for signed URLs and local object URLs. */
export function loadGarmentImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the garment image"));
    image.src = url;
  });
}
