import React, { useEffect, useState } from "react";
import { useAuth } from "@/core/auth";
import { fetchOrgDrawings, type DrawingEntry } from "@/core/supabase/drawingsGallery";
import styles from "./Gallery.module.css";

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
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Community Gallery</h2>
        <button className={styles.back} onClick={onBack}>
          Back
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {!error && items === null && <p className={styles.status}>Loading...</p>}
      {items && items.length === 0 && (
        <p className={styles.status}>No drawings claimed yet. Be the first!</p>
      )}

      {items && items.length > 0 && (
        <div className={styles.grid}>
          {items.map((it) => (
            <div key={it.id} className={styles.card}>
              <img src={it.imageUrl} alt={it.prompt ?? "drawing"} className={styles.thumb} />
              <p className={styles.caption}>
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
