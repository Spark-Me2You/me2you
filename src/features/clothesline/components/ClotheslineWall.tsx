/**
 * The community clothesline: ropes strung across the screen with everyone's
 * garments pegged to them, newest first.
 */

import { CLOTHESLINE_CONFIG } from "../config/clotheslineConfig";
import type { GarmentWithUrl } from "../types";
import { GarmentPeg } from "./GarmentPeg";

const ROPE = "absolute inset-x-0 top-[6px] h-[6px] rounded-full bg-ink-soft/70 shadow-tape";

interface ClotheslineWallProps {
  garments: GarmentWithUrl[];
}

export function ClotheslineWall({ garments }: ClotheslineWallProps) {
  const ropes: GarmentWithUrl[][] = [];
  for (let i = 0; i < garments.length; i += CLOTHESLINE_CONFIG.perRope) {
    ropes.push(garments.slice(i, i + CLOTHESLINE_CONFIG.perRope));
  }
  // An empty line still shows its rope.
  if (!ropes.length) ropes.push([]);

  return (
    <div className="flex w-full flex-col gap-6">
      {ropes.map((rope, ropeIndex) => (
        <div
          key={ropeIndex}
          className={`relative h-[270px] w-full ${ropeIndex % 2 ? "-rotate-[0.6deg]" : "rotate-[0.6deg]"}`}
        >
          <div className={ROPE} aria-hidden="true" />
          <div className="absolute inset-x-10 top-0 flex items-start justify-around">
            {rope.map((garment, index) => (
              <GarmentPeg
                key={garment.id}
                garment={garment}
                index={ropeIndex * CLOTHESLINE_CONFIG.perRope + index}
                className="max-h-[230px] max-w-[180px]"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
