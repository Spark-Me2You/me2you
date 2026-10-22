/**
 * Candy Art
 * Looks for every item, built once per screen size from the loaded images
 * (see itemImages.ts). Pooled PieceViews just swap looks, so nothing is
 * redrawn per spawn.
 */

import { GraphicsContext, Rectangle, Texture } from "pixi.js";
import type { GumballSliceConfig } from "../config/gumballSliceConfig";
import type { ItemKind } from "../types/gumballSlice";

export interface Look {
  texture: Texture;
  scale: number;
  rotation: number;
  anchorX: number; // halves pivot on the cut edge so they start in place
}

export interface ItemArt {
  whole: Look;
  /** The image's left and right halves, shown after a slice. */
  halves: [Look, Look];
  particleColor: string;
}

/** Textures loaded by the game component before the engine starts. */
export interface ItemTextures {
  candies: { texture: Texture; particleColor: string }[];
  rainbow: { texture: Texture; particleColor: string };
  broccoli: Texture;
}

export interface ArtSet {
  /** One entry per candy image; rainbow and broccoli have one each. */
  variants: Record<ItemKind, ItemArt[]>;
  dot: GraphicsContext; // unit-radius white circle for particles/cursor
  speck: GraphicsContext; // unit square for sugar specks
}

/** An image item; it splits down the middle into its left and right halves. */
function spriteArt(texture: Texture, size: number, rotationDeg: number, particleColor: string): ItemArt {
  const { x, y, width, height } = texture.frame;
  const scale = size / Math.max(width, height);
  const rotation = (rotationDeg * Math.PI) / 180;
  const piece = (frame: Rectangle, anchorX: number): Look => ({
    texture: new Texture({ source: texture.source, frame }),
    scale,
    rotation,
    anchorX,
  });
  return {
    whole: { texture, scale, rotation, anchorX: 0.5 },
    halves: [
      piece(new Rectangle(x, y, width / 2, height), 1),
      piece(new Rectangle(x + width / 2, y, width / 2, height), 0),
    ],
    particleColor,
  };
}

export function buildArt(radius: number, config: GumballSliceConfig, textures: ItemTextures): ArtSet {
  return {
    variants: {
      candy: textures.candies.map((c) =>
        spriteArt(c.texture, radius * 2 * config.CANDY_IMAGE_SCALE, 0, c.particleColor),
      ),
      rainbow: [
        spriteArt(
          textures.rainbow.texture,
          radius * 2 * config.CANDY_IMAGE_SCALE,
          0,
          textures.rainbow.particleColor,
        ),
      ],
      broccoli: [
        spriteArt(
          textures.broccoli,
          radius * config.BROCCOLI_SIZE,
          config.BROCCOLI_ROTATION_DEG,
          config.BROCCOLI_COLOR,
        ),
      ],
    },
    dot: new GraphicsContext().circle(0, 0, 1).fill({ color: config.TRAIL_CORE_COLOR }),
    speck: new GraphicsContext().rect(-1, -1, 2, 2).fill({ color: config.TRAIL_CORE_COLOR }),
  };
}

export function destroyArt(art: ArtSet): void {
  // Full image textures belong to the Assets cache; only the half textures
  // cut from them here are ours to destroy.
  for (const list of Object.values(art.variants)) {
    for (const v of list) {
      v.halves[0].texture.destroy(false);
      v.halves[1].texture.destroy(false);
    }
  }
  art.dot.destroy();
  art.speck.destroy();
}
