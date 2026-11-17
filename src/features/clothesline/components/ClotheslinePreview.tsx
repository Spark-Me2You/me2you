/**
 * Mini clothesline for the home screen: the latest few garments hanging on a
 * short rope under the clothesline button. Renders nothing while the line is empty.
 */

import { useAuth } from "@/core/auth";
import { CLOTHESLINE_CONFIG } from "../config/clotheslineConfig";
import { useClotheslineGarments } from "../hooks/useClotheslineGarments";
import { GarmentPeg } from "./GarmentPeg";

interface ClotheslinePreviewProps {
  /** Position and width; the caller pins it. */
  className?: string;
}

export function ClotheslinePreview({ className = "" }: ClotheslinePreviewProps) {
  const { kioskOrgId } = useAuth();
  const { garments } = useClotheslineGarments(kioskOrgId, CLOTHESLINE_CONFIG.previewLimit);

  if (!garments.length) return null;

  return (
    <div className={`pointer-events-none ${className}`} data-testid="clothesline-preview">
      <div className="absolute inset-x-0 top-[5px] h-[5px] rounded-full bg-ink-soft/70" aria-hidden="true" />
      <div className="relative flex items-start justify-around px-4">
        {garments.map((garment, index) => (
          <GarmentPeg
            key={garment.id}
            garment={garment}
            index={index}
            className="max-h-[120px] max-w-[96px]"
          />
        ))}
      </div>
    </div>
  );
}
