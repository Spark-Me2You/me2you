import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth";
import {
  deleteMyDrawing,
  fetchMyDrawings,
  type DrawingEntry,
} from "@/core/supabase/drawingsGallery";
import styles from "./UserGalleryPage.module.css";

export const UserGalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<DrawingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const entries = await fetchMyDrawings(user.id);
      setItems(entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load drawings");
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (entry: DrawingEntry) => {
    if (!confirm(`Delete this drawing${entry.prompt ? ` of "${entry.prompt}"` : ""}?`)) return;
    setDeletingId(entry.id);
    try {
      await deleteMyDrawing({ id: entry.id, imagePath: entry.imagePath });
      setItems((prev) => (prev ? prev.filter((i) => i.id !== entry.id) : prev));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>my drawings</h1>
        <button className={styles.back} onClick={() => navigate("/user/profile")}>
          Back
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {!error && items === null && <p className={styles.status}>Loading...</p>}
      {items && items.length === 0 && (
        <p className={styles.status}>No drawings yet. Scan a kiosk QR to claim one!</p>
      )}

      {items && items.length > 0 && (
        <div className={styles.grid}>
          {items.map((it) => (
            <div key={it.id} className={styles.card}>
              <button
                type="button"
                className={styles.delete}
                aria-label="Delete drawing"
                onClick={() => handleDelete(it)}
                disabled={deletingId === it.id}
              >
                ×
              </button>
              <img src={it.imageUrl} alt={it.prompt ?? "drawing"} className={styles.thumb} />
              <p className={styles.caption}>{it.prompt ?? "untitled"}</p>
              <p className={styles.date}>
                {new Date(it.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
