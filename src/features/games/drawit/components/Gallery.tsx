import React, { useEffect, useState } from "react";
import { useAuth } from "@/core/auth";
import { fetchOrgDrawings, type DrawingEntry } from "@/core/supabase/drawingsGallery";
import { pageCount, pageSlice } from "./galleryPaging";

const headerButton =
  "cursor-pointer rounded-[8px] border-2 border-solid border-[#a7d1f5] bg-white px-7 py-[10px] font-jersey text-[26px] tracking-[3px] text-[#036] disabled:cursor-default disabled:opacity-40";

interface Props {
  onBack: () => void;
}

export const Gallery: React.FC<Props> = ({ onBack }) => {
  const { kioskOrgId } = useAuth();
  const [items, setItems] = useState<DrawingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Zero-based; page 0 holds the most recent drawings (fetch is newest first).
  const [page, setPage] = useState(0);

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

  const totalPages = pageCount(items?.length ?? 0);
  const current = Math.min(page, totalPages - 1);
  const visible = items ? pageSlice(items, current) : [];

  return (
    <div className="box-border h-screen w-full overflow-y-auto bg-[linear-gradient(180deg,#e6f2ff_0%,#c4dff5_100%)] p-10 font-jersey">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="m-0 text-[52px] tracking-[6px] text-[#036]">Community Gallery</h2>
        <div className="flex items-center gap-4">
          {items && items.length > 0 && (
            <>
              <button
                className={headerButton}
                onClick={() => setPage(current - 1)}
                disabled={current === 0}
                aria-label="Newer drawings"
              >
                ←
              </button>
              <span className="min-w-[80px] text-center text-[26px] tracking-[3px] text-[#036]" aria-live="polite">
                {current + 1}/{totalPages}
              </span>
              <button
                className={headerButton}
                onClick={() => setPage(current + 1)}
                disabled={current >= totalPages - 1}
                aria-label="Older drawings"
              >
                →
              </button>
            </>
          )}
          <button className={headerButton} onClick={onBack}>
            Back
          </button>
        </div>
      </div>

      {error && <p className="text-[28px] tracking-[2px] text-[#a00]">{error}</p>}
      {!error && items === null && <p className="text-[28px] tracking-[2px] text-[#036]">Loading...</p>}
      {items && items.length === 0 && (
        <p className="text-[28px] tracking-[2px] text-[#036]">No drawings claimed yet. Be the first!</p>
      )}

      {items && items.length > 0 && (
        <div className="grid grid-cols-4 gap-5">
          {visible.map((it) => (
            <div key={it.id} className="rounded-[6px] border border-solid border-[#a7d1f5] bg-white p-[10px] shadow-[0_2px_6px_rgba(0,0,0,0.1)] [transition:transform_150ms_ease,box-shadow_150ms_ease] hover:backdrop-blur-[4px] hover:[transform:scale(1.03)] hover:shadow-[0_4px_14px_rgba(0,80,160,0.25)]">
              <img src={it.imageUrl} alt={it.prompt ?? "drawing"} className="aspect-[16/10] w-full border border-solid border-[#a7d1f5] bg-white object-cover" />
              <p className="m-0 mt-2 text-center text-[22px] tracking-[2px] text-[#036]">
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
