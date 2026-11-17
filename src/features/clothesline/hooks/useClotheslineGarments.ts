import { useCallback, useEffect, useState } from "react";
import { clotheslineStore } from "../services/clotheslineStore";
import type { GarmentWithUrl } from "../types";

/** Newest garments on an org's clothesline; refreshes when this kiosk hangs one. */
export function useClotheslineGarments(orgId: string | null | undefined, limit: number) {
  const [garments, setGarments] = useState<GarmentWithUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => clotheslineStore.subscribe(refresh), [refresh]);

  useEffect(() => {
    let cancelled = false;
    const load = orgId ? clotheslineStore.listLine(orgId, limit) : Promise.resolve([]);
    load
      .catch(() => [] as GarmentWithUrl[])
      .then((rows) => {
        if (cancelled) return;
        setGarments(rows);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, limit, version]);

  return { garments, isLoading, refresh };
}
