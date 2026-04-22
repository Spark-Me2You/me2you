import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth";
import {
  deleteMyDrawing,
  fetchMyDrawings,
  type DrawingEntry,
} from "@/core/supabase/drawingsGallery";
import { supabase } from "@/core/supabase/client";
import styles from "./UserGalleryPage.module.css";

interface EntryWithPath extends DrawingEntry {
  imagePath: string;
}

export const UserGalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<EntryWithPath[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Re-fetch image_path separately so we can pass it to the delete helper
      // without changing the shared DrawingEntry shape.
      const [entries, { data: rows }] = await Promise.all([
        fetchMyDrawings(user.id),
        supabase
          .from("drawings")
          .select("id, image_path")
          .eq("owner_id", user.id),
      ]);

      const pathById = new Map<string, string>(
        (rows ?? []).map((r) => [r.id as string, r.image_path as string]),
      );

      setItems(
        entries.map((e) => ({ ...e, imagePath: pathById.get(e.id) ?? "" })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load drawings");
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (entry: EntryWithPath) => {
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
