/**
 * Candy Art
 * Looks for every item, built once per screen size. Candy is vector art in
 * shared GraphicsContexts; broccoli is the photo sprite (Broccoli_PNG_Picture),
 * stood upright. Pooled PieceViews just swap looks, so nothing is redrawn per
 * spawn.
 *
 * Good candy: round, glossy, white rim. Broccoli: a real photo with an
 * irregular silhouette, so it reads differently by colour and shape at speed.
 */

import { GraphicsContext, Rectangle, Texture } from "pixi.js";
import type { GumballSliceConfig } from "../config/gumballSliceConfig";
import type { ItemKind } from "../types/gumballSlice";

export type Look =
  | { type: "vector"; context: GraphicsContext }
  | { type: "sprite"; texture: Texture; scale: number; rotation: number };

export interface ItemArt {
  whole: Look;
  /** The two pieces after a slice. Vector halves are the top half (y < 0), cut edge on the x axis. */
  halves: [Look, Look];
  particleColor: string;
}

export interface ArtSet {
  /** Gumballs come in several colours; other kinds have one entry. */
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

function vectorArt(whole: GraphicsContext, half: GraphicsContext, particleColor: string): ItemArt {
  const halfLook: Look = { type: "vector", context: half };
  return { whole: { type: "vector", context: whole }, halves: [halfLook, halfLook], particleColor };
}

function gumball(r: number, color: string, config: GumballSliceConfig): ItemArt {
  const whole = new GraphicsContext();
  glossyBall(whole, r, color, config.OUTLINE_GOOD);
  const half = new GraphicsContext();
  cutHalf(half, r, color, config.OUTLINE_GOOD);
  return vectorArt(whole, half, color);
}

function wrapped(r: number, config: GumballSliceConfig): ItemArt {
  const color = config.WRAPPED_COLOR;
  const rim = config.OUTLINE_GOOD;
  const whole = new GraphicsContext();
  // Twisted wrapper ends
  whole
    .poly([-r * 0.55, 0, -r * 1.15, -r * 0.5, -r * 1.15, r * 0.5])
    .fill({ color })
    .stroke({ width: r * 0.08, color: rim });
  whole
    .poly([r * 0.55, 0, r * 1.15, -r * 0.5, r * 1.15, r * 0.5])
    .fill({ color })
    .stroke({ width: r * 0.08, color: rim });
  glossyBall(whole, r * 0.78, color, rim);
  // Wrapper stripes
  whole.rect(-r * 0.12, -r * 0.74, r * 0.24, r * 1.48).fill({ color: rim, alpha: 0.35 });
  const half = new GraphicsContext();
  cutHalf(half, r * 0.8, color, rim);
  return vectorArt(whole, half, color);
}

function swirl(r: number, config: GumballSliceConfig): ItemArt {
  const color = config.SWIRL_COLOR;
  const rim = config.OUTLINE_GOOD;
  const whole = new GraphicsContext();
  whole.circle(0, 0, r).fill({ color }).stroke({ width: r * 0.1, color: rim });
  // Pinwheel swirl: alternating wedges
  for (let i = 0; i < 6; i += 2) {
    const a = (i * Math.PI) / 3;
    whole
      .moveTo(0, 0)
      .arc(0, 0, r * 0.86, a, a + Math.PI / 3)
      .closePath()
      .fill({ color: rim, alpha: 0.75 });
  }
  whole.circle(0, 0, r * 0.18).fill({ color: rim });
  const half = new GraphicsContext();
  cutHalf(half, r, color, rim);
  return vectorArt(whole, half, color);
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
  return vectorArt(whole, half, color);
}

/** Broccoli photo, rotated upright; it splits down the middle into two image halves. */
function broccoli(r: number, texture: Texture, config: GumballSliceConfig): ItemArt {
  const { x, y, width, height } = texture.frame;
  const scale = (r * config.BROCCOLI_SIZE) / Math.max(width, height);
  const rotation = (config.BROCCOLI_ROTATION_DEG * Math.PI) / 180;
  const piece = (frame: Rectangle): Look => ({
    type: "sprite",
    texture: new Texture({ source: texture.source, frame }),
    scale,
    rotation,
  });
  return {
    whole: { type: "sprite", texture, scale, rotation },
    halves: [
      piece(new Rectangle(x, y, width / 2, height)),
      piece(new Rectangle(x + width / 2, y, width / 2, height)),
    ],
    particleColor: config.BROCCOLI_COLOR,
  };
}

export function buildArt(radius: number, config: GumballSliceConfig, broccoliTexture: Texture): ArtSet {
  return {
    variants: {
      gumball: config.CANDY_COLORS.map((c) => gumball(radius, c, config)),
      wrapped: [wrapped(radius, config)],
      swirl: [swirl(radius, config)],
      golden: [golden(radius, config)],
      broccoli: [broccoli(radius, broccoliTexture, config)],
    },
    dot: new GraphicsContext().circle(0, 0, 1).fill({ color: config.TRAIL_CORE_COLOR }),
    speck: new GraphicsContext().rect(-1, -1, 2, 2).fill({ color: config.TRAIL_CORE_COLOR }),
  };
}

export function destroyArt(art: ArtSet): void {
  // The full broccoli texture belongs to the Assets cache; only the half
  // textures cut from it here are ours to destroy.
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
