/**
 * Mobile wardrobe: the clothes a user has claimed from the clothesline.
 * Tops can be worn on the mii; anything can be deleted. Changes save at once.
 */

import { useCallback, useEffect, useState } from "react";
import { clotheslineStore } from "../services/clotheslineStore";
import type { GarmentWithUrl } from "../types";

interface MyClothesProps {
  userId: string;
  orgId: string;
  /** The top the mii is wearing changed (null = nothing). */
  onWornChange: (garment: GarmentWithUrl | null) => void;
}

const CHIP =
  "cursor-pointer rounded-[20px] border-2 border-solid border-orange px-3 py-[6px] font-jersey text-[16px] tracking-[1px] lowercase disabled:cursor-not-allowed disabled:opacity-50";

export function MyClothes({ userId, orgId, onWornChange }: MyClothesProps) {
  const [clothes, setClothes] = useState<GarmentWithUrl[] | null>(null);
  const [wornId, setWornId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([clotheslineStore.listMine(userId), clotheslineStore.getEquipped([userId])])
      .then(([mine, equipped]) => {
        if (cancelled) return;
        const worn = equipped[userId] ?? null;
        setClothes(mine);
        setWornId(worn?.id ?? null);
        onWornChange(worn);
      })
      .catch((err) => {
        console.warn("[clothesline] could not load wardrobe:", err);
        if (!cancelled) setClothes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, onWornChange]);

  const wear = useCallback(
    async (garment: GarmentWithUrl | null) => {
      setBusyId(garment?.id ?? wornId);
      setError(null);
      try {
        await clotheslineStore.setEquipped(userId, orgId, garment?.id ?? null);
        setWornId(garment?.id ?? null);
        onWornChange(garment);
      } catch (err) {
        console.error("[clothesline] wear failed:", err);
        setError("couldn't change your outfit. try again!");
      } finally {
        setBusyId(null);
      }
    },
    [onWornChange, orgId, userId, wornId],
  );

  const remove = useCallback(
    async (garment: GarmentWithUrl) => {
      setBusyId(garment.id);
      setError(null);
      try {
        await clotheslineStore.remove(garment);
        setClothes((current) => current?.filter((item) => item.id !== garment.id) ?? null);
        if (wornId === garment.id) {
          setWornId(null);
          onWornChange(null);
        }
      } catch (err) {
        console.error("[clothesline] delete failed:", err);
        setError("couldn't delete that. try again!");
      } finally {
        setBusyId(null);
        setConfirmId(null);
      }
    },
    [onWornChange, wornId],
  );

  if (clothes === null) return null;

  return (
    <section className="flex w-full flex-col items-center gap-3" aria-label="my clothes">
      <h3 className="m-0 font-jersey text-[26px] tracking-[2px] text-orange lowercase">my clothes</h3>

      {clothes.length === 0 ? (
        <p className="m-0 text-center font-jersey text-[15px] leading-[1.25] text-ink-muted lowercase">
          nothing here yet. visit the clothesline on the big screen, hang up your outfit and scan
          the code to wear it!
        </p>
      ) : (
        <ul className="m-0 grid w-full list-none grid-cols-2 gap-3 p-0">
          {clothes.map((garment) => {
            const isWorn = garment.id === wornId;
            const isBusy = busyId === garment.id;
            return (
              <li
                key={garment.id}
                className={`flex flex-col items-center gap-2 rounded-[16px] border-2 border-solid bg-white p-2 ${isWorn ? "border-orange" : "border-transparent"}`}
              >
                <img
                  src={garment.url}
                  alt={garment.kind === "top" ? "a top you claimed" : "bottoms you claimed"}
                  className="h-[96px] w-full object-contain"
                />
                {confirmId === garment.id ? (
                  <div className="flex gap-2">
                    <button type="button" className={`${CHIP} bg-orange text-white`} disabled={isBusy} onClick={() => remove(garment)}>
                      {isBusy ? "deleting" : "delete"}
                    </button>
                    <button type="button" className={`${CHIP} bg-white text-orange`} disabled={isBusy} onClick={() => setConfirmId(null)}>
                      keep
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {garment.kind === "top" ? (
                      <button
                        type="button"
                        className={`${CHIP} ${isWorn ? "bg-orange text-white" : "bg-white text-orange"}`}
                        disabled={busyId !== null}
                        aria-pressed={isWorn}
                        onClick={() => wear(isWorn ? null : garment)}
                      >
                        {isWorn ? "take off" : "wear"}
                      </button>
                    ) : (
                      <span className="px-1 py-[8px] font-jersey text-[14px] text-ink-muted lowercase">on the line</span>
                    )}
                    <button
                      type="button"
                      className={`${CHIP} bg-white text-orange`}
                      disabled={busyId !== null}
                      aria-label="delete this from the clothesline"
                      onClick={() => setConfirmId(garment.id)}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && <p role="alert" className="m-0 text-center font-jersey text-[15px] text-error">{error}</p>}
    </section>
  );
}
