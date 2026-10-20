import React, { useEffect, useState } from "react";
import { useAuth } from "@/core/auth";
import { fetchOrgDrawings, type DrawingEntry } from "@/core/supabase/drawingsGallery";
import { BTN_MD, BTN_SECONDARY } from "../../components/gameUi";

const MESSAGE = "font-averia text-body-xl text-white/85";
// Polaroids on the wall sit a little crooked
const TILTS = ["rotate-[-2deg]", "rotate-[1.5deg]", "rotate-[-1deg]", "rotate-[2deg]"];

interface Props {
  onBack: () => void;
}

export const Gallery: React.FC<Props> = ({ onBack }) => {
  const { kioskOrgId } = useAuth();
  const [items, setItems] = useState<DrawingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kioskOrgId) {
      setError("Kiosk session is missing an org — sign in again.");
      return;
    }
    let cancelled = false;
    fetchOrgDrawings(kioskOrgId)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load gallery");
      });
    return () => {
      cancelled = true;
    };
  }, [kioskOrgId]);

  return (
    <div className="box-border h-screen w-full overflow-y-auto bg-games-gradient p-10 font-jersey">
      <div className="mb-10 flex items-center justify-between">
        <h2 className="m-0 font-jersey text-display-xl leading-none tracking-brand text-white lowercase text-shadow-pop">community gallery</h2>
        <button className={`${BTN_MD} ${BTN_SECONDARY}`} onClick={onBack}>
          back
        </button>
      </div>

      {error && <p className={MESSAGE}>{error}</p>}
      {!error && items === null && <p className={MESSAGE}>loading...</p>}
      {items && items.length === 0 && (
        <p className={MESSAGE}>no drawings claimed yet. be the first!</p>
      )}

      {items && items.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-6 gap-y-10">
          {items.map((it, i) => (
            <div
              key={it.id}
              className={`relative rounded-[6px] bg-polaroid p-[10px] pb-3 shadow-note transition-[scale] duration-150 ease-out hover:scale-103 ${TILTS[i % TILTS.length]}`}
            >
              <div className={`pointer-events-none absolute -top-3 left-1/2 h-[22px] w-[90px] -translate-x-1/2 shadow-tape ${i % 2 ? "rotate-[4deg] bg-tape-alt/80" : "rotate-[-4deg] bg-tape/80"}`} aria-hidden="true" />
              <img src={it.imageUrl} alt={it.prompt ?? "drawing"} className="aspect-[16/10] w-full bg-white object-cover shadow-well" />
              <p className="m-0 mt-2 text-center text-[22px] tracking-brand text-ink">
                {it.prompt ?? "untitled"}
                {it.ownerName ? ` — ${it.ownerName}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
