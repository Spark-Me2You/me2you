/**
 * Review step: the visitor sees exactly what will be hung before anything is
 * saved, can toss either piece, retake, or walk away with nothing kept.
 */

import { useState } from "react";
import { LoadingDots } from "@/shared/components";
import type { CapturedGarment } from "../types";
import { NOTE, NOTE_TAPE, PILL, PILL_SMALL, SUBTITLE, TITLE, WELL } from "./styles";

const KIND_LABEL = { top: "top", bottom: "bottoms" } as const;

interface ReviewGarmentsProps {
  garments: CapturedGarment[];
  isSaving: boolean;
  error: string | null;
  onHang: (kept: CapturedGarment[]) => void;
  onRetake: () => void;
  onDiscard: () => void;
}

export function ReviewGarments({
  garments,
  isSaving,
  error,
  onHang,
  onRetake,
  onDiscard,
}: ReviewGarmentsProps) {
  const [tossed, setTossed] = useState<ReadonlySet<number>>(new Set());
  const kept = garments.filter((_, index) => !tossed.has(index));

  const toggle = (index: number) =>
    setTossed((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <div className="absolute inset-0 flex flex-col items-center pt-8">
      <h1 className={TITLE}>looking good!</h1>
      <p className={`${SUBTITLE} mt-3`}>here's what we'll hang on the line</p>

      <div className="mt-8 flex items-start gap-12">
        <div className="flex gap-8">
          {garments.map((garment, index) => {
            const isTossed = tossed.has(index);
            return (
              <div key={garment.previewUrl} className="flex flex-col items-center gap-4">
                <div className={`${WELL} flex h-[520px] w-[420px] items-center justify-center p-6`}>
                  <img
                    src={garment.previewUrl}
                    alt={`your ${KIND_LABEL[garment.kind]}`}
                    draggable={false}
                    className={`max-h-full max-w-full object-contain select-none ${isTossed ? "opacity-20" : ""}`}
                  />
                </div>
                <span className="font-jersey text-body-xl leading-none tracking-brand text-ink lowercase">
                  {KIND_LABEL[garment.kind]}
                  {isTossed && " (tossed)"}
                </span>
                <button
                  type="button"
                  className={`${PILL_SMALL} ${isTossed ? "bg-action-network" : "bg-ink-muted"}`}
                  onClick={() => toggle(index)}
                  disabled={isSaving}
                >
                  {isTossed ? "keep it" : "toss this one"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex w-[460px] flex-col items-center gap-7 pt-2">
          <div className={`${NOTE} w-full -rotate-[1.5deg] px-7 pt-9 pb-6`}>
            <div className={NOTE_TAPE} aria-hidden="true" />
            <p className="m-0 font-averia text-body-lg leading-[1.3] tracking-[1px] lowercase">
              <span className="font-bold">check first!</span> everyone here can see the line. if
              there's a name tag, badge or anything else you'd rather not show, toss it or retake.
            </p>
          </div>

          {error && (
            <p role="alert" className="m-0 text-center font-averia text-body-lg font-bold tracking-[1px] text-error lowercase">
              {error}
            </p>
          )}

          <button
            type="button"
            className={`${PILL} w-full gap-3 bg-action-clothesline`}
            onClick={() => onHang(kept)}
            disabled={isSaving || kept.length === 0}
          >
            {isSaving ? (
              <>
                hanging <LoadingDots />
              </>
            ) : (
              "hang it up!"
            )}
          </button>
          <div className="flex gap-5">
            <button type="button" className={`${PILL_SMALL} bg-action-network`} onClick={onRetake} disabled={isSaving}>
              retake
            </button>
            <button type="button" className={`${PILL_SMALL} bg-ink-muted`} onClick={onDiscard} disabled={isSaving}>
              don't keep any
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
