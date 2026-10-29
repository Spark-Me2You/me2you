import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth";
import {
  deleteMyDrawing,
  fetchMyDrawings,
  type DrawingEntry,
} from "@/core/supabase/drawingsGallery";

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
    <div className="box-border min-h-screen bg-[linear-gradient(180deg,#e6f2ff_0%,#c4dff5_100%)] px-4 pt-6 pb-12 font-jersey-arial">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="m-0 text-[36px] tracking-[4px] text-[#003366]">my drawings</h1>
        <button className="cursor-pointer rounded-[8px] border-2 border-solid border-[#A7D1F5] bg-white px-[18px] py-2 font-jersey-arial text-[18px] tracking-[2px] text-[#003366]" onClick={() => navigate("/user/profile")}>
          Back
        </button>
      </div>

      {error && <p className="mt-10 text-center text-[18px] tracking-[2px] text-[#aa0000]">{error}</p>}
      {!error && items === null && <p className="mt-10 text-center text-[18px] tracking-[2px] text-[#003366]">Loading...</p>}
      {items && items.length === 0 && (
        <p className="mt-10 text-center text-[18px] tracking-[2px] text-[#003366]">No drawings yet. Scan a kiosk QR to claim one!</p>
      )}

      {items && items.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-[14px]">
          {items.map((it) => (
            <div key={it.id} className="relative rounded-[6px] border border-solid border-[#A7D1F5] bg-white p-2 shadow-[0_2px_6px_rgba(0,0,0,0.1)]">
              <button
                type="button"
                className="absolute top-[6px] right-[6px] h-7 w-7 cursor-pointer rounded-full border-0 bg-[rgba(170,0,0,0.85)] p-0 text-[16px] leading-none text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Delete drawing"
                onClick={() => handleDelete(it)}
                disabled={deletingId === it.id}
              >
                ×
              </button>
              <img src={it.imageUrl} alt={it.prompt ?? "drawing"} className="block aspect-square w-full border border-solid border-[#A7D1F5] bg-white object-cover" />
              <p className="m-0 mt-[6px] overflow-hidden text-center text-[16px] tracking-[1px] text-ellipsis whitespace-nowrap text-[#003366]">{it.prompt ?? "untitled"}</p>
              <p className="m-0 mt-[2px] text-center text-[12px] tracking-[1px] text-[#5a7a99]">
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
