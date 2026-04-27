import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth";
import type { Accessory } from "@/core/auth/AuthContext";
import type { CSSProperties } from "react";
import { profileService } from "@/features/profile-editor/services/profileService";
import { USER_MII_ACCESSORY_CSS_VARS } from "@/shared/utils";
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

export const CustomizeAvatarView: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile, setUserProfile, session } = useAuth();

  const [selected, setSelected] = useState<Accessory | null>(
    userProfile?.accessory ?? null,
  );
  const [bobbleheadUrl, setBobbleheadUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    profileService
      .getCurrentProfile({ userId: user?.id })
      .then((data) => setBobbleheadUrl(data?.bobbleheadUrl ?? null))
      .catch((err) =>
        console.warn("[CustomizeAvatarView] Failed to load preview:", err),
      );
  }, [user?.id]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await profileService.updateProfile(
        user.id,
        { accessory: selected },
        { sessionExpiresAt: session?.expires_at ?? null },
      );
      setUserProfile(updated);
      navigate(-1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <img src={logo} alt="me2you" className={styles.logo} />

      <div className={styles.content}>
        <div className={styles.card}>
          <h2 className={styles.title}>customize avatar</h2>

          {/* Mii preview with accessory overlay */}
          <div className={styles.previewStage}>
            <div
              className={styles.miiComposite}
              style={USER_MII_ACCESSORY_CSS_VARS as CSSProperties}
            >
              <img src={miiBody} alt="" className={styles.miiBody} />
              {bobbleheadUrl && (
                <img src={bobbleheadUrl} alt="" className={styles.miiFace} />
              )}
              {selected && (
                <img
                  src={ACCESSORY_PREVIEWS[selected]}
                  alt={selected}
                  className={
                    selected === "sunglasses"
                      ? styles.accessorySunglasses
                      : selected === "hat"
                        ? styles.accessoryHat
                        : styles.accessoryBalloon
                  }
                />
              )}
            </div>
          </div>

          {/* Accessory chip selector */}
          <div className={styles.chipRow}>
            {ACCESSORY_LABELS.map(({ key, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => setSelected(key)}
                className={`${styles.chip} ${selected === key ? styles.chipActive : ""}`}
              >
                {label}
              </button>
            ))}
          </div>

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
