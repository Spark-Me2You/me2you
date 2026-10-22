/**
 * Candy Art
 * Looks for every item, built once per screen size. Candy and broccoli are
 * image sprites (see itemImages.ts); the golden bonus candy is vector art in a
 * shared GraphicsContext so it stays clearly different. Pooled PieceViews just
 * swap looks, so nothing is redrawn per spawn.
 */

import { GraphicsContext, Rectangle, Texture } from "pixi.js";
import type { GumballSliceConfig } from "../config/gumballSliceConfig";
import type { ItemKind } from "../types/gumballSlice";

export type Look =
  | { type: "vector"; context: GraphicsContext }
  | {
      type: "sprite";
      texture: Texture;
      scale: number;
      rotation: number;
      anchorX: number; // halves pivot on the cut edge so they start in place
    };

export interface ItemArt {
  whole: Look;
  /**
   * The two pieces after a slice. Vector: both are the top half (y < 0, cut
   * edge on the x axis). Sprite: the image's left and right halves.
   */
  halves: [Look, Look];
  particleColor: string;
}

/** Textures loaded by the game component before the engine starts. */
export interface ItemTextures {
  candies: { texture: Texture; particleColor: string }[];
  broccoli: Texture;
}

export interface ArtSet {
  /** Candy has one entry per image; other kinds have one entry. */
  variants: Record<ItemKind, ItemArt[]>;
  dot: GraphicsContext; // unit-radius white circle for particles/cursor
  speck: GraphicsContext; // unit square for sugar specks
}

function glossyBall(ctx: GraphicsContext, r: number, color: string, rim: string): void {
  ctx.circle(0, 0, r).fill({ color }).stroke({ width: r * 0.1, color: rim });
  ctx.ellipse(-r * 0.32, -r * 0.38, r * 0.34, r * 0.2).fill({ color: rim, alpha: 0.55 });
  ctx.circle(-r * 0.05, -r * 0.55, r * 0.07).fill({ color: rim, alpha: 0.8 });
}

function cutHalf(ctx: GraphicsContext, r: number, color: string, outline: string): void {
  ctx.arc(0, 0, r, Math.PI, 0).closePath().fill({ color }).stroke({ width: r * 0.1, color: outline });
  // Lighter "inside" visible on the cut face.
  ctx.ellipse(0, -r * 0.06, r * 0.82, r * 0.14).fill({ color: outline, alpha: 0.5 });
}

function golden(r: number, config: GumballSliceConfig): ItemArt {
  const color = config.GOLDEN_COLOR;
  const rim = config.OUTLINE_GOOD;
  const whole = new GraphicsContext();
  whole.circle(0, 0, r * 1.35).fill({ color, alpha: 0.25 });
  glossyBall(whole, r, color, rim);
  whole.star(0, r * 0.1, 5, r * 0.45, r * 0.2).fill({ color: rim });
  const half = new GraphicsContext();
  cutHalf(half, r, color, rim);
  const halfLook: Look = { type: "vector", context: half };
  return { whole: { type: "vector", context: whole }, halves: [halfLook, halfLook], particleColor: color };
}

/** An image item; it splits down the middle into its left and right halves. */
function spriteArt(texture: Texture, size: number, rotationDeg: number, particleColor: string): ItemArt {
  const { x, y, width, height } = texture.frame;
  const scale = size / Math.max(width, height);
  const rotation = (rotationDeg * Math.PI) / 180;
  const piece = (frame: Rectangle, anchorX: number): Look => ({
    type: "sprite",
    texture: new Texture({ source: texture.source, frame }),
    scale,
    rotation,
    anchorX,
  });
  return {
    whole: { type: "sprite", texture, scale, rotation, anchorX: 0.5 },
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
      golden: [golden(radius, config)],
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
  const destroyLook = (look: Look, ownsTexture: boolean) => {
    if (look.type === "vector") look.context.destroy();
    else if (ownsTexture) look.texture.destroy(false);
  };
  for (const list of Object.values(art.variants)) {
    for (const v of list) {
      destroyLook(v.whole, false);
      if (v.halves[0] !== v.halves[1]) destroyLook(v.halves[1], true);
      destroyLook(v.halves[0], true);
    }
  }
  art.dot.destroy();
  art.speck.destroy();
}
