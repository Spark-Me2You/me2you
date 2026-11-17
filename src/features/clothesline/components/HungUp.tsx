/**
 * After hanging: confirms the garments are on the line and, when the Supabase
 * backend is on, shows a QR so the visitor can claim them and dress their mii.
 */

import { useMemo, useState } from "react";
import { ClaimSection } from "@/features/claim";
import type { ClaimPayload } from "@/features/claim";
import { clotheslineStore } from "../services/clotheslineStore";
import type { CapturedGarment, Garment } from "../types";
import { GarmentPeg } from "./GarmentPeg";
import { PILL, SUBTITLE, TITLE } from "./styles";

interface HungUpProps {
  /** Rows saved to the line. */
  hung: Garment[];
  /** The cutouts they came from, for the picture. */
  pieces: CapturedGarment[];
  onDone: () => void;
}

export function HungUp({ hung, pieces, onDone }: HungUpProps) {
  const [claimed, setClaimed] = useState(false);

  const payload = useMemo<ClaimPayload>(
    () => ({
      version: "1.0",
      type: "garment",
      display: { title: "Claim your outfit", description: "wear it on your mii" },
      data: { garment_ids: hung.map((garment) => garment.id) },
    }),
    [hung],
  );

  return (
    <div className="absolute inset-0 flex flex-col items-center pt-8">
      <h1 className={TITLE}>it's on the line!</h1>
      <p className={`${SUBTITLE} mt-3`}>thanks for showing off your outfit</p>

      <div className="mt-10 flex items-center gap-20">
        <div className="relative h-[460px] w-[640px]">
          <div className="absolute inset-x-0 top-[8px] h-[6px] rounded-full bg-ink-soft/70 shadow-tape" aria-hidden="true" />
          <div className="absolute inset-x-8 top-0 flex items-start justify-around">
            {pieces.map((piece, index) => (
              <GarmentPeg
                key={piece.previewUrl}
                garment={{ url: piece.previewUrl, kind: piece.kind }}
                index={index}
                className="max-h-[400px] max-w-[280px]"
              />
            ))}
          </div>
        </div>

        <div className="flex w-[520px] flex-col items-center gap-6 rounded-glass bg-glass px-10 py-9 shadow-glass-card">
          {!clotheslineStore.canClaim ? (
            <p className="m-0 text-center font-averia text-body-xl leading-[1.3] tracking-brand text-ink lowercase">
              soon you'll be able to scan a code here and wear it on your mii!
            </p>
          ) : claimed ? (
            <p className="m-0 animate-pop-in text-center font-averia text-body-xl leading-[1.3] tracking-brand text-ink lowercase">
              claimed! open <span className="font-bold text-magenta">customize avatar</span> on your
              phone to put it on your mii.
            </p>
          ) : (
            <>
              <p className="m-0 text-center font-jersey text-display-md leading-none tracking-brand text-ink lowercase">
                wear it on your mii
              </p>
              <ClaimSection payload={payload} onClaimed={() => setClaimed(true)} />
              <p className="m-0 text-center font-averia text-body-md leading-[1.35] tracking-[1px] text-ink lowercase">
                scan with your phone to add it to your mii's wardrobe. clothes nobody
                claims come down after a day.
              </p>
            </>
          )}
        </div>
      </div>

      <button type="button" className={`${PILL} mt-10 bg-action-clothesline`} onClick={onDone}>
        see the line
      </button>
    </div>
  );
}
