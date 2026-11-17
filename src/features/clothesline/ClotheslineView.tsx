/**
 * Clothesline — kiosk screen
 * line → photo booth → review → hung up. Designed at 1920×1080 and scaled to
 * fit, like the home screen. See docs/CLOTHESLINE.md.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/core/auth";
import { useAppState } from "@/core/state-machine";
import { AppState } from "@/core/state-machine/appStateMachine";
import { ExitButton } from "@/shared/components";
import { CameraPreview, PinnedRegistrationQR } from "@/features/kiosk";
import { CLOTHESLINE_CONFIG } from "./config/clotheslineConfig";
import { disposeClothesSegmenter } from "./cv/clothesSegmenter";
import { useClotheslineGarments } from "./hooks/useClotheslineGarments";
import { clotheslineStore } from "./services/clotheslineStore";
import type { CapturedGarment, Garment } from "./types";
import { ClotheslineWall } from "./components/ClotheslineWall";
import { HungUp } from "./components/HungUp";
import { PhotoBooth } from "./components/PhotoBooth";
import { ReviewGarments } from "./components/ReviewGarments";
import { NOTE, NOTE_TAPE, PILL, STEP_BADGE, STEP_TEXT, SUBTITLE, TITLE } from "./components/styles";

type Stage =
  | { kind: "line" }
  | { kind: "booth" }
  | { kind: "review"; garments: CapturedGarment[] }
  | { kind: "hung"; hung: Garment[]; pieces: CapturedGarment[] };

const HOW_IT_WORKS = [
  "step into the photo booth",
  "we cut out just your clothes",
  "hang them up for everyone to see!",
];

const revoke = (garments: CapturedGarment[]) =>
  garments.forEach((garment) => URL.revokeObjectURL(garment.previewUrl));

export function ClotheslineView() {
  const { transitionTo } = useAppState();
  const { kioskOrgId } = useAuth();
  const { garments, isLoading } = useClotheslineGarments(kioskOrgId, CLOTHESLINE_CONFIG.lineLimit);
  const [stage, setStage] = useState<Stage>({ kind: "line" });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Cutouts that only exist in memory; released when they're no longer shown.
  const pendingRef = useRef<CapturedGarment[]>([]);
  const release = useCallback(() => {
    revoke(pendingRef.current);
    pendingRef.current = [];
  }, []);

  useEffect(
    () => () => {
      revoke(pendingRef.current);
      disposeClothesSegmenter();
    },
    [],
  );

  const backToLine = useCallback(() => {
    release();
    setSaveError(null);
    setStage({ kind: "line" });
  }, [release]);

  const handleCaptured = useCallback(
    (captured: CapturedGarment[]) => {
      release();
      pendingRef.current = captured;
      setSaveError(null);
      setStage({ kind: "review", garments: captured });
    },
    [release],
  );

  const handleRetake = useCallback(() => {
    release();
    setSaveError(null);
    setStage({ kind: "booth" });
  }, [release]);

  const handleHang = useCallback(
    async (kept: CapturedGarment[]) => {
      if (!kioskOrgId) {
        setSaveError("this kiosk isn't signed in to an organization. ask a staff member!");
        return;
      }
      setIsSaving(true);
      setSaveError(null);
      try {
        const hung = await clotheslineStore.hang(kioskOrgId, kept);
        setStage({ kind: "hung", hung, pieces: kept });
      } catch (error) {
        console.error("[clothesline] hang failed:", error);
        setSaveError("we couldn't hang your clothes. try again!");
      } finally {
        setIsSaving(false);
      }
    },
    [kioskOrgId],
  );

  return (
    <>
      <div className="relative h-[1080px] w-[1920px] origin-top-left [transform:scale(min(calc(100vw_/_1920),calc(100vh_/_1080)))]">
        <div className="absolute inset-0 bg-page-gradient" />
        <ExitButton onClick={() => transitionTo(AppState.IDLE)} label="home" />

        {stage.kind === "line" && (
          <div className="absolute inset-0 flex flex-col items-center pt-8">
            <h1 className={TITLE}>clothesline</h1>
            <p className={`${SUBTITLE} mt-3`}>what is everyone wearing today?</p>

            <div className="mt-8 w-[1560px]">
              <ClotheslineWall garments={garments} />
            </div>

            {!isLoading && garments.length === 0 && (
              <p className="absolute top-[300px] m-0 rounded-glass bg-glass px-12 py-6 font-averia text-body-xl tracking-brand text-ink lowercase shadow-glass-card">
                nothing on the line yet. be the first to hang something up!
              </p>
            )}

            <div className="absolute bottom-10 flex items-end gap-12">
              <div className={`${NOTE} flex -rotate-[1.5deg] gap-7 px-7 pt-8 pb-5`}>
                <div className={NOTE_TAPE} aria-hidden="true" />
                {HOW_IT_WORKS.map((step, index) => (
                  <div key={step} className="flex w-[220px] items-start gap-3">
                    <span className={STEP_BADGE}>{index + 1}</span>
                    <p className={STEP_TEXT}>{step}</p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className={`${PILL} bg-action-clothesline`}
                onClick={() => setStage({ kind: "booth" })}
              >
                add my outfit
              </button>
            </div>
          </div>
        )}

        {stage.kind === "booth" && <PhotoBooth onCaptured={handleCaptured} onCancel={backToLine} />}

        {stage.kind === "review" && (
          <ReviewGarments
            garments={stage.garments}
            isSaving={isSaving}
            error={saveError}
            onHang={handleHang}
            onRetake={handleRetake}
            onDiscard={backToLine}
          />
        )}

        {stage.kind === "hung" && (
          <HungUp hung={stage.hung} pieces={stage.pieces} onDone={backToLine} />
        )}
      </div>

      <PinnedRegistrationQR />
      {stage.kind === "line" && <CameraPreview />}
    </>
  );
}
