/**
 * Candy Art
 * Vector art for every item, built once per round size as shared
 * GraphicsContexts so pooled Graphics just swap contexts (no redraw per spawn).
 *
 * Good candy: round, glossy, white rim. Bad items: black outline and a
 * non-round silhouette (bumpy broccoli tree, pointed lemon with a sour face)
 * so they read differently by both colour and shape at speed.
 */

import { GraphicsContext } from "pixi.js";
import type { GumballSliceConfig } from "../config/gumballSliceConfig";
import type { ItemKind } from "../types/gumballSlice";

export interface ItemArt {
  whole: GraphicsContext;
  half: GraphicsContext; // top half (y < 0), cut edge along the x axis
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

function gumball(r: number, color: string, config: GumballSliceConfig): ItemArt {
  const whole = new GraphicsContext();
  glossyBall(whole, r, color, config.OUTLINE_GOOD);
  const half = new GraphicsContext();
  cutHalf(half, r, color, config.OUTLINE_GOOD);
  return { whole, half, particleColor: color };
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
  return { whole, half, particleColor: color };
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
  return { whole, half, particleColor: color };
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
  return { whole, half, particleColor: color };
}

function broccoli(r: number, config: GumballSliceConfig): ItemArt {
  const crown = config.BROCCOLI_COLOR;
  const shade = config.BROCCOLI_SHADE_COLOR;
  const outline = config.OUTLINE_BAD;
  const w = r * 0.12;
  const whole = new GraphicsContext();
  // Stem
  whole
    .poly([-r * 0.28, 0, r * 0.28, 0, r * 0.38, r * 1.05, -r * 0.38, r * 1.05])
    .fill({ color: shade })
    .stroke({ width: w, color: outline });
  // Bumpy crown (florets)
  const florets: [number, number, number][] = [
    [-r * 0.62, -r * 0.05, r * 0.45],
    [r * 0.62, -r * 0.05, r * 0.45],
    [-r * 0.3, -r * 0.5, r * 0.5],
    [r * 0.3, -r * 0.5, r * 0.5],
    [0, -r * 0.12, r * 0.5],
  ];
  for (const [x, y, fr] of florets) {
    whole.circle(x, y, fr).fill({ color: crown }).stroke({ width: w, color: outline });
  }
  for (const [x, y, fr] of florets) {
    whole.circle(x - fr * 0.25, y - fr * 0.2, fr * 0.22).fill({ color: shade });
  }
  const half = new GraphicsContext();
  cutHalf(half, r, crown, outline);
  return { whole, half, particleColor: crown };
}

function lemon(r: number, config: GumballSliceConfig): ItemArt {
  const color = config.LEMON_COLOR;
  const outline = config.OUTLINE_BAD;
  const w = r * 0.12;
  const whole = new GraphicsContext();
  // Pointed ends
  whole
    .poly([-r * 1.0, -r * 0.2, -r * 1.35, 0, -r * 1.0, r * 0.2])
    .fill({ color })
    .stroke({ width: w, color: outline });
  whole
    .poly([r * 1.0, -r * 0.2, r * 1.35, 0, r * 1.0, r * 0.2])
    .fill({ color })
    .stroke({ width: w, color: outline });
  whole.ellipse(0, 0, r * 1.08, r * 0.8).fill({ color }).stroke({ width: w, color: outline });
  // Sour face: squinting eyes + wavy mouth
  const eye = r * 0.16;
  whole
    .moveTo(-r * 0.45 - eye, -r * 0.3)
    .lineTo(-r * 0.45 + eye, -r * 0.18)
    .moveTo(r * 0.45 + eye, -r * 0.3)
    .lineTo(r * 0.45 - eye, -r * 0.18)
    .moveTo(-r * 0.4, r * 0.3)
    .quadraticCurveTo(-r * 0.2, r * 0.12, 0, r * 0.3)
    .quadraticCurveTo(r * 0.2, r * 0.48, r * 0.4, r * 0.3)
    .stroke({ width: w, color: outline, cap: "round" });
  const half = new GraphicsContext();
  cutHalf(half, r, color, outline);
  return { whole, half, particleColor: color };
}

export function buildArt(radius: number, config: GumballSliceConfig): ArtSet {
  return {
    variants: {
      gumball: config.CANDY_COLORS.map((c) => gumball(radius, c, config)),
      wrapped: [wrapped(radius, config)],
      swirl: [swirl(radius, config)],
      golden: [golden(radius, config)],
      broccoli: [broccoli(radius, config)],
      lemon: [lemon(radius, config)],
    },
    dot: new GraphicsContext().circle(0, 0, 1).fill({ color: config.TRAIL_CORE_COLOR }),
    speck: new GraphicsContext().rect(-1, -1, 2, 2).fill({ color: config.TRAIL_CORE_COLOR }),
  };
}

export function destroyArt(art: ArtSet): void {
  for (const list of Object.values(art.variants)) {
    for (const v of list) {
      v.whole.destroy();
      v.half.destroy();
    }
  }
  art.dot.destroy();
  art.speck.destroy();
}
