import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth";
import type { Accessory } from "@/core/auth/AuthContext";
import type { CSSProperties } from "react";
import { profileService } from "@/features/profile-editor/services/profileService";
import { accessoryService } from "@/features/profile-editor/services/accessoryService";
import type { AccessorySettings } from "@/features/profile-editor/types/profileTypes";
import { DEFAULT_ACCESSORY_SETTINGS } from "@/features/profile-editor/types/profileTypes";
import { computeUserMiiAccessoryCssVars } from "@/shared/utils";
import logo from "@/assets/me2you.png";
import miiBody from "@/assets/mii_body.png";
import styles from "./CustomizeAvatarView.module.css";

const ACCESSORY_PREVIEWS: Record<Accessory, string> = {
  sunglasses: "/accessories/sunglasses.svg",
  hat: "/accessories/hat.svg",
  balloon: "/accessories/balloon.svg",
};

const ACCESSORY_LABELS: { key: Accessory | null; label: string }[] = [
  { key: null, label: "none" },
  { key: "sunglasses", label: "sunglasses" },
  { key: "hat", label: "hat" },
  { key: "balloon", label: "balloon" },
];

// Preview container size in CSS pixels (matches .previewStage in CSS)
const PREVIEW_SIZE_PX = 220;

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

export const CustomizeAvatarView: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const [settings, setSettings] = useState<AccessorySettings>(DEFAULT_ACCESSORY_SETTINGS);
  const [bobbleheadUrl, setBobbleheadUrl] = useState<string | null>(null);
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
      setSettings(accSettings);
    }).catch((err) =>
      console.warn("[CustomizeAvatarView] Failed to load preview:", err),
    );
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
      navigate(-1);
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

  const cssVars = computeUserMiiAccessoryCssVars(
    settings.selected_accessory,
    settings.relative_x,
    settings.relative_y,
    settings.scale,
  );

  const hasAccessory = settings.selected_accessory !== null;

  return (
    <div className={styles.page}>
      <img src={logo} alt="me2you" className={styles.logo} />

      <div className={styles.content}>
        <div className={styles.card}>
          <h2 className={styles.title}>customize avatar</h2>

          {/* Mii preview with accessory overlay + drag + scale slider */}
          <div className={styles.previewRow}>
            <div
              ref={previewRef}
              className={`${styles.previewStage} ${hasAccessory ? styles.previewDraggable : ""}`}
              onMouseDown={hasAccessory ? handleMouseDown : undefined}
              onTouchStart={hasAccessory ? handleTouchStart : undefined}
            >
              <div
                className={styles.miiComposite}
                style={cssVars as CSSProperties}
              >
                <img src={miiBody} alt="" className={styles.miiBody} />
                {bobbleheadUrl && (
                  <img src={bobbleheadUrl} alt="" className={styles.miiFace} />
                )}
                {settings.selected_accessory && (
                  <img
                    src={ACCESSORY_PREVIEWS[settings.selected_accessory]}
                    alt={settings.selected_accessory}
                    className={
                      settings.selected_accessory === "sunglasses"
                        ? styles.accessorySunglasses
                        : settings.selected_accessory === "hat"
                          ? styles.accessoryHat
                          : styles.accessoryBalloon
                    }
                  />
                )}
              </div>
            </div>

            {/* Vertical scale slider */}
            {hasAccessory && (
              <div className={styles.scaleSliderWrapper}>
                <span className={styles.scaleLabel}>big</span>
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
                  className={styles.scaleSlider}
                  aria-label="Accessory size"
                />
                <span className={styles.scaleLabel}>small</span>
              </div>
            )}
          </div>

          {/* Drag hint */}
          {hasAccessory && (
            <p className={styles.dragHint}>drag to reposition</p>
          )}

          {/* Accessory chip selector */}
          <div className={styles.chipRow}>
            {ACCESSORY_LABELS.map(({ key, label }) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  setSettings((prev) => ({ ...prev, selected_accessory: key }))
                }
                className={`${styles.chip} ${settings.selected_accessory === key ? styles.chipActive : ""}`}
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
              className={styles.resetButton}
            >
              reset position
            </button>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.buttonRow}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={styles.cancelButton}
            >
              cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={styles.saveButton}
            >
              {isSaving ? "saving..." : "save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
