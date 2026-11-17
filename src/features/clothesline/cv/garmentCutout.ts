/**
 * Garment cutout
 * Turns a garment mask plus the source frame into a transparent PNG. Only
 * pixels inside the mask are copied; the rest of the frame never reaches the
 * output canvas.
 */

import { CLOTHESLINE_CONFIG } from "../config/clotheslineConfig";
import type { GarmentMask } from "./garmentMask";

export interface Cutout {
  blob: Blob;
  width: number;
  height: number;
}

const toBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the cutout"))),
      "image/png",
    );
  });

/**
 * Per-pixel alpha for a mask: opaque inside, fading over the outermost pixels
 * so the low-resolution mask doesn't leave a stair-stepped edge. The fade only
 * ever lowers alpha inside the mask; pixels outside it stay fully transparent.
 */
export function featheredAlpha(mask: Uint8Array, width: number, height: number): Uint8ClampedArray {
  const alpha = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      let inside = 0;
      let total = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          total++;
          inside += mask[ny * width + nx];
        }
      }
      alpha[i] = Math.round((inside / total) * 255);
    }
  }
  return alpha;
}

/**
 * Cut one garment out of the frame.
 * @param frame  Canvas holding the captured photo, the same size as the mask.
 */
export async function cutOutGarment(
  frame: HTMLCanvasElement,
  garment: GarmentMask,
): Promise<Cutout> {
  const { width, height } = frame;
  const { xMin, yMin, xMax, yMax } = garment.bounds;
  const cropW = xMax - xMin + 1;
  const cropH = yMax - yMin + 1;

  const frameCtx = frame.getContext("2d", { willReadFrequently: true });
  if (!frameCtx) throw new Error("Could not read the photo");
  const source = frameCtx.getImageData(xMin, yMin, cropW, cropH);
  const alpha = featheredAlpha(garment.mask, width, height);

  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const a = alpha[(y + yMin) * width + (x + xMin)];
      const p = (y * cropW + x) * 4;
      if (a === 0) {
        // Wipe the colour too, so nothing outside the mask survives in the
        // RGB channels of a transparent pixel.
        source.data[p] = 0;
        source.data[p + 1] = 0;
        source.data[p + 2] = 0;
      }
      source.data[p + 3] = a;
    }
  }

  const crop = document.createElement("canvas");
  crop.width = cropW;
  crop.height = cropH;
  const cropCtx = crop.getContext("2d");
  if (!cropCtx) throw new Error("Could not draw the cutout");
  cropCtx.putImageData(source, 0, 0);

  const scale = Math.min(1, CLOTHESLINE_CONFIG.cutoutSize / Math.max(cropW, cropH));
  if (scale === 1) return { blob: await toBlob(crop), width: cropW, height: cropH };

  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(cropW * scale));
  out.height = Math.max(1, Math.round(cropH * scale));
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("Could not draw the cutout");
  outCtx.imageSmoothingQuality = "high";
  outCtx.drawImage(crop, 0, 0, out.width, out.height);
  return { blob: await toBlob(out), width: out.width, height: out.height };
}
