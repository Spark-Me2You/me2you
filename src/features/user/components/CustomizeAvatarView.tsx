import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth";
import type { Accessory } from "@/core/auth/AuthContext";
import { profileService } from "@/features/profile-editor/services/profileService";
import { accessoryService } from "@/features/profile-editor/services/accessoryService";
import type {
  AccessorySettings,
  AvatarLandmarkPoints,
} from "@/features/profile-editor/types/profileTypes";
import { DEFAULT_ACCESSORY_SETTINGS } from "@/features/profile-editor/types/profileTypes";
import logo from "@/assets/me2you.png";
import { UserMiiPixiPreview } from "./UserMiiPixiPreview";

const ACCESSORY_LABELS: { key: Accessory | null; label: string }[] = [
  { key: null, label: "none" },
  { key: "sunglasses", label: "sunglasses" },
  { key: "hat", label: "hat" },
  { key: "balloon", label: "balloon" },
];

// Preview container size in CSS pixels (matches the preview stage's w/h-[220px] classes)
const PREVIEW_SIZE_PX = 220;

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

export const CustomizeAvatarView: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const [settings, setSettings] = useState<AccessorySettings>(DEFAULT_ACCESSORY_SETTINGS);
  const [bobbleheadUrl, setBobbleheadUrl] = useState<string | null>(null);
  const [bobbleheadLandmarks, setBobbleheadLandmarks] =
    useState<AvatarLandmarkPoints | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track pointer drag state without causing re-renders mid-drag
  const dragStart = useRef<{ px: number; py: number; rx: number; ry: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      profileService.getCurrentProfile({ userId: user.id }),
      accessoryService.getAccessorySettings(user.id),
    ]).then(([profileData, accSettings]) => {
      setBobbleheadUrl(profileData?.bobbleheadUrl ?? null);
      setBobbleheadLandmarks(profileData?.bobbleheadLandmarks ?? null);
      setSettings(accSettings);
    }).catch((err) =>
      console.warn("[CustomizeAvatarView] Failed to load preview:", err),
    ).finally(() => {
      setIsDataLoading(false);
    });
  }, [user?.id]);

  // --- Drag handlers ---

  const onDragStart = useCallback(
    (clientX: number, clientY: number) => {
      if (!settings.selected_accessory) return;
      dragStart.current = {
        px: clientX,
        py: clientY,
        rx: settings.relative_x,
        ry: settings.relative_y,
      };
    },
    [settings.selected_accessory, settings.relative_x, settings.relative_y],
  );

  const onDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragStart.current) return;
    const deltaX = clientX - dragStart.current.px;
    const deltaY = clientY - dragStart.current.py;
    const newRx = clamp(
      dragStart.current.rx + (deltaX / PREVIEW_SIZE_PX) * 100,
      -40,
      40,
    );
    const newRy = clamp(
      dragStart.current.ry + (deltaY / PREVIEW_SIZE_PX) * 100,
      -40,
      40,
    );
    setSettings((prev) => ({ ...prev, relative_x: newRx, relative_y: newRy }));
  }, []);

  const onDragEnd = useCallback(() => {
    dragStart.current = null;
  }, []);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(e.clientX, e.clientY);
  };
  const handleMouseMove = useCallback(
    (e: MouseEvent) => onDragMove(e.clientX, e.clientY),
    [onDragMove],
  );
  const handleMouseUp = useCallback(() => onDragEnd(), [onDragEnd]);

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    onDragStart(t.clientX, t.clientY);
  };
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) onDragMove(t.clientX, t.clientY);
    },
    [onDragMove],
  );
  const handleTouchEnd = useCallback(() => onDragEnd(), [onDragEnd]);

  // Attach/detach global drag listeners
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    return () => {
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchMove, handleTouchEnd]);

  // --- Save ---

  const handleSave = async () => {
    if (!user || !userProfile?.org_id) return;
    setIsSaving(true);
    setError(null);
    try {
      await accessoryService.upsertAccessorySettings(
        user.id,
        userProfile.org_id,
        settings,
      );
      navigate("/user/profile", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings((prev) => ({
      ...prev,
      relative_x: 0,
      relative_y: 0,
      scale: 1,
    }));
  };

  const hasAccessory = settings.selected_accessory !== null;

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[linear-gradient(to_bottom,#58e7f7_0%,#fefffb_100%)]">
      <img src={logo} alt="me2you" className="pointer-events-none absolute top-[7px] left-1/2 z-[100] w-[270px] origin-top -translate-x-1/2 rotate-[3.41deg] select-none" />

      <div className="block min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 pt-24 pb-8 [-webkit-overflow-scrolling:touch]">
        <div className="mx-auto flex w-full max-w-[350px] flex-col items-center gap-5 rounded-[24px] bg-glass px-[28px] py-8 shadow-glass backdrop-brightness-98 backdrop-hue-rotate-10 backdrop-saturate-105">
          <h2 className="m-0 text-center font-jersey text-[36px] tracking-[2px] text-[#e44805] lowercase">customize avatar</h2>

          {/* Mii preview with accessory overlay + drag + scale slider */}
          <div className="flex items-center gap-3">
            <div
              ref={previewRef}
              className={`h-[220px] w-[220px] shrink-0 overflow-hidden rounded-[16px] border-[3px] border-solid border-[#e44805] bg-[#fefffb] ${hasAccessory ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
              onMouseDown={hasAccessory ? handleMouseDown : undefined}
              onTouchStart={hasAccessory ? handleTouchStart : undefined}
            >
              {isDataLoading ? (
                <div className="flex h-full w-full items-center justify-center font-jersey text-[16px] text-[#999]">loading</div>
              ) : (
                <UserMiiPixiPreview
                  className="relative h-full w-full bg-[#fefffb]"
                  bobbleheadUrl={bobbleheadUrl}
                  accessorySettings={settings}
                  landmarks={bobbleheadLandmarks}
                />
              )}
            </div>

            {/* Vertical scale slider */}
            {hasAccessory && (
              <div className="flex h-[220px] flex-col items-center justify-center gap-[6px]">
                <span className="text-center font-jersey text-[13px] leading-none text-[#e44805] select-none">big</span>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  value={settings.scale}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      scale: parseFloat(e.target.value),
                    }))
                  }
                  className="h-[140px] w-8 shrink-0 cursor-pointer [direction:rtl] [writing-mode:vertical-lr] accent-[#e44805] [appearance:slider-vertical] [-webkit-appearance:slider-vertical]"
                  aria-label="Accessory size"
                />
                <span className="text-center font-jersey text-[13px] leading-none text-[#e44805] select-none">small</span>
              </div>
            )}
          </div>

          {/* Drag hint */}
          {hasAccessory && (
            <p className="m-0 mt-[-8px] text-center font-jersey text-[14px] text-[#999] select-none">drag to reposition</p>
          )}

          {/* Accessory chip selector */}
          <div className="flex w-full flex-wrap justify-center gap-2">
            {ACCESSORY_LABELS.map(({ key, label }) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  setSettings((prev) => ({ ...prev, selected_accessory: key }))
                }
                className={`cursor-pointer rounded-[20px] border-2 border-solid border-[#e44805] px-4 py-[10px] font-jersey text-[18px] tracking-[1px] lowercase [transition:background_0.15s,color_0.15s,transform_0.1s] active:[transform:scale(0.96)] ${settings.selected_accessory === key ? "bg-[#e44805] text-white hover:bg-[#c53d04]" : "bg-[rgba(228,72,5,0.08)] text-[#e44805] hover:bg-[rgba(228,72,5,0.16)]"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Reset placement */}
          {hasAccessory && (
            <button
              type="button"
              onClick={handleReset}
              className="cursor-pointer rounded-[10px] border border-dashed border-[#e44805] bg-transparent px-[18px] py-2 font-jersey text-[16px] tracking-[1px] text-[#e44805] lowercase transition-[background] duration-150 hover:bg-[rgba(228,72,5,0.07)]"
            >
              reset position
            </button>
          )}

          {error && <p className="m-0 text-center font-jersey text-[15px] text-[#d32f2f]">{error}</p>}

          <div className="flex w-full gap-[10px]">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 border-[#ccc] bg-[rgba(0,0,0,0.05)] text-[#666] hover:bg-[rgba(0,0,0,0.1)] cursor-pointer rounded-[14px] border-2 border-solid px-[14px] py-[18px] font-jersey text-[22px] tracking-[1px] lowercase [transition:background_0.2s,transform_0.1s] active:enabled:[transform:scale(0.98)]"
            >
              cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-2 border-[#e44805] bg-[#e44805] text-white hover:enabled:bg-[#c53d04] disabled:cursor-not-allowed disabled:border-[#c8a090] disabled:bg-[#c8a090] cursor-pointer rounded-[14px] border-2 border-solid px-[14px] py-[18px] font-jersey text-[22px] tracking-[1px] lowercase [transition:background_0.2s,transform_0.1s] active:enabled:[transform:scale(0.98)]"
            >
              {isSaving ? "saving..." : "save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
