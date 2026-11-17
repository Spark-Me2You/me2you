/**
 * One garment hanging from a clothesline by a peg. The caller sizes it with
 * `className` (max width / height); the garment swings gently from the top.
 */

import type { GarmentWithUrl } from "../types";

// Sway animates `rotate`, so no rotate utility may sit on this element.
const HANGER = "relative flex origin-top animate-garment-sway flex-col items-center";
const PEG = "z-[1] -mb-[10%] h-[18%] max-h-[34px] min-h-[10px] w-[9%] min-w-[5px] max-w-[14px] rounded-[3px] bg-note shadow-tape";

interface GarmentPegProps {
  garment: Pick<GarmentWithUrl, "url" | "kind">;
  /** Position on the line, used to stagger the sway. */
  index?: number;
  /** Size limits for the garment image. */
  className?: string;
}

export function GarmentPeg({ garment, index = 0, className = "" }: GarmentPegProps) {
  return (
    <div
      className={HANGER}
      // Runtime value: each garment starts its swing at a different point.
      style={{ animationDelay: `${-(index % 5) * 700}ms` }}
    >
      <span className={PEG} aria-hidden="true" />
      <img
        src={garment.url}
        alt={garment.kind === "top" ? "someone's top" : "someone's bottoms"}
        draggable={false}
        className={`block object-contain drop-shadow-md select-none ${className}`}
      />
    </div>
  );
}
