import React, { useState, useEffect, useRef, useCallback } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth";
import { profileService } from "@/features/profile-editor/services/profileService";
import { hubService } from "@/features/hub/services/hubService";
import { storageService } from "@/core/supabase";
import type {
  ProfileWithImage,
  UpdateProfileInput,
  GestureCategory,
} from "@/features/profile-editor/types/profileTypes";
import type { Accessory } from "@/core/auth/AuthContext";
import { computeUserMiiAccessoryCssVars } from "@/shared/utils";
import { accessoryService } from "@/features/profile-editor/services/accessoryService";
import type { AccessorySettings } from "@/features/profile-editor/types/profileTypes";
import { DEFAULT_ACCESSORY_SETTINGS } from "@/features/profile-editor/types/profileTypes";
import logo from "@/assets/me2you.png";
import miiBody from "@/assets/mii_body.png";

const ACCESSORY_PREVIEWS: Record<Accessory, string> = {
  sunglasses: "/accessories/sunglasses.svg",
  hat: "/accessories/hat.svg",
  balloon: "/accessories/balloon.svg",
};
import labelBanner1 from "@/assets/label_banner1.svg";
import labelBanner2 from "@/assets/label_banner2b.svg";
import labelBanner3 from "@/assets/label_banner3.svg";
import { UserProfileEditForm } from "./UserProfileEditForm";
import { UserPhotoCaptureModal } from "./UserPhotoCaptureModal";
import { ClaimScanner } from "@/features/claim";
import styles from "./UserProfileView.module.css";

export const UserProfileView: React.FC = () => {
  const navigate = useNavigate();
  const { signOut, setUserProfile, session } = useAuth();
  const currentUserId = session?.user.id ?? null;

  const [profileData, setProfileData] = useState<ProfileWithImage | null>(null);
  const [gestureImageUrl, setGestureImageUrl] = useState<string | null>(null);
  const [accessorySettings, setAccessorySettings] = useState<AccessorySettings>(DEFAULT_ACCESSORY_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"picture" | "mii">("picture");

  const mountedRef = useRef(true);
  const loadRequestIdRef = useRef(0);
  const saveRequestIdRef = useRef(0);

  const loadProfile = useCallback(
    async (options?: { setLoading?: boolean }) => {
      const setLoading = options?.setLoading ?? true;
      const requestId = ++loadRequestIdRef.current;

      if (setLoading) {
        setIsLoading(true);
      }

      try {
        const [data, accSettings] = await Promise.all([
          profileService.getCurrentProfile({ userId: currentUserId }),
          currentUserId
            ? accessoryService.getAccessorySettings(currentUserId)
            : Promise.resolve(DEFAULT_ACCESSORY_SETTINGS),
        ]);

        if (!mountedRef.current || requestId !== loadRequestIdRef.current) {
          return;
        }

        setProfileData(data);
        setAccessorySettings(accSettings);

        if (data?.profile.org_id && data.profile.id) {
          try {
            const path = await hubService.getGestureImageByOwnerId(
              data.profile.id,
              data.profile.org_id,
            );
            if (!mountedRef.current || requestId !== loadRequestIdRef.current) {
              return;
            }
            if (path) {
              const url = await storageService.getPhotoUrl(path);
              if (
                !mountedRef.current ||
                requestId !== loadRequestIdRef.current
              ) {
                return;
              }
              setGestureImageUrl(url);
            } else {
              setGestureImageUrl(null);
            }
          } catch (gestureErr) {
            console.warn(
              "[UserProfileView] Failed to fetch gesture image:",
              gestureErr,
            );
            if (mountedRef.current && requestId === loadRequestIdRef.current) {
              setGestureImageUrl(null);
            }
          }
        }
      } catch (err) {
        if (!mountedRef.current || requestId !== loadRequestIdRef.current) {
          return;
        }

        console.error("[UserProfileView] Failed to load profile:", err);
      } finally {
        if (
          setLoading &&
          mountedRef.current &&
          requestId === loadRequestIdRef.current
        ) {
          setIsLoading(false);
        }
      }
    },
    [currentUserId],
  );

  useEffect(() => {
    mountedRef.current = true;
    loadProfile();

    return () => {
      mountedRef.current = false;
    };
  }, [loadProfile]);

  const nextSaveToken = useCallback(() => {
    return ++saveRequestIdRef.current;
  }, []);

  const handleSaveProfile = async (data: UpdateProfileInput) => {
    if (!profileData) return;

    const requestNum = nextSaveToken();

    setIsSaving(true);
    setSaveError(null);

    try {
      const updated = await profileService.updateProfile(
        profileData.profile.id,
        data,
        {
          sessionExpiresAt: session?.expires_at ?? null,
        },
      );

      if (!mountedRef.current || requestNum !== saveRequestIdRef.current) {
        return;
      }

      setUserProfile(updated);
      setProfileData((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          profile: updated,
        };
      });
      setMode("view");
    } catch (e) {
      if (!mountedRef.current || requestNum !== saveRequestIdRef.current) {
        return;
      }

      const message = e instanceof Error ? e.message : "failed to save profile";
      setSaveError(message);
    } finally {
      if (mountedRef.current && requestNum === saveRequestIdRef.current) {
        setIsSaving(false);
      }
    }
  };

  const handlePhotoCapture = async (photo: Blob, category: GestureCategory) => {
    if (!profileData?.profile.org_id) return;

    const requestNum = nextSaveToken();

    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await profileService.updatePhoto(
        photo,
        profileData.profile.id,
        profileData.profile.org_id,
        category,
        profileData.imageId,
        profileData.imageStoragePath,
        {
          sessionExpiresAt: session?.expires_at ?? null,
        },
      );

      if (!mountedRef.current || requestNum !== saveRequestIdRef.current) {
        return;
      }

      if (result.bobbleheadError) {
        setSaveError(
          `photo saved, but bobblehead generation failed: ${result.bobbleheadError}`,
        );
      }
      setIsPhotoModalOpen(false);

      void loadProfile({ setLoading: false }).catch((refreshError) => {
        console.warn(
          "[UserProfileView] Post-photo profile refresh failed:",
          refreshError,
        );
      });
    } catch (e) {
      if (!mountedRef.current || requestNum !== saveRequestIdRef.current) {
        return;
      }

      const message = e instanceof Error ? e.message : "failed to update photo";
      setSaveError(message);
    } finally {
      if (mountedRef.current && requestNum === saveRequestIdRef.current) {
        setIsSaving(false);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/user");
    } catch (error) {
      console.error("[UserProfileView] Sign out failed:", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      setDeleteError(null);
      return;
    }
    try {
      setIsDeleting(true);
      await profileService.deleteAccount();
      await signOut();
      navigate("/user");
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : "failed to delete account",
      );
      setIsConfirmingDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <img src={logo} alt="me2you" className={styles.logo} />
        <div className={styles.content}>
          <div className={styles.profileCard}>
            <div className={styles.photoPlaceholder}>
              <span className={styles.loadingText}>loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  if (mode === "edit") {
    return (
      <>
        <UserProfileEditForm
          initialData={profileData}
          gestureImageUrl={gestureImageUrl}
          onSave={handleSaveProfile}
          onCancel={() => {
            setMode("view");
            setSaveError(null);
          }}
          onChangePhoto={() => setIsPhotoModalOpen(true)}
          isSubmitting={isSaving}
          error={saveError}
        />
        <UserPhotoCaptureModal
          isOpen={isPhotoModalOpen}
          onClose={() => {
            setIsPhotoModalOpen(false);
            setSaveError(null);
          }}
          onCapture={handlePhotoCapture}
          isSubmitting={isSaving}
        />
      </>
    );
  }

  const { profile } = profileData;

  return (
    <>
      {isScannerOpen && (
        <ClaimScanner onClose={() => setIsScannerOpen(false)} />
      )}
      <div className={styles.page}>
        {/* Hidden SVG filter for fractal texture */}
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <filter
              id="fractalTexture"
              x="0"
              y="0"
              width="100%"
              height="100%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.25 0.25"
                numOctaves={3}
                seed={805}
              />
              <feDisplacementMap
                in="SourceGraphic"
                scale={8}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>

        <img src={logo} alt="me2you" className={styles.logo} />

        <div className={styles.content}>
          <div className={styles.profileCard}>
            <div className={styles.avatarCard}>
              <div className={styles.tabBar}>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === "picture" ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab("picture")}
                >
                  my picture
                </button>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === "mii" ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab("mii")}
                >
                  my mii
                </button>
              </div>
              <div className={styles.avatarStage}>
                {activeTab === "picture" ? (
                  gestureImageUrl || profileData.imageUrl ? (
                    <img
                      src={gestureImageUrl ?? profileData.imageUrl ?? ""}
                      alt={profile.name}
                      className={styles.picture}
                    />
                  ) : (
                    <div className={styles.pictureFallback}>
                      <span className={styles.initials}>
                        {profile.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )
                ) : (
                  <div
                    className={styles.miiComposite}
                    style={computeUserMiiAccessoryCssVars(
                      accessorySettings.selected_accessory,
                      accessorySettings.relative_x,
                      accessorySettings.relative_y,
                      accessorySettings.scale,
                    ) as CSSProperties}
                  >
                    <img src={miiBody} alt="" className={styles.miiBody} />
                    {profileData.bobbleheadUrl ? (
                      <img
                        src={profileData.bobbleheadUrl}
                        alt=""
                        className={styles.miiFace}
                      />
                    ) : (
                      <div className={styles.miiFaceMissing}>no face yet</div>
                    )}
                    {accessorySettings.selected_accessory && (
                      <img
                        src={ACCESSORY_PREVIEWS[accessorySettings.selected_accessory]}
                        alt={accessorySettings.selected_accessory}
                        className={
                          accessorySettings.selected_accessory === "sunglasses"
                            ? styles.accessorySunglasses
                            : accessorySettings.selected_accessory === "hat"
                              ? styles.accessoryHat
                              : styles.accessoryBalloon
                        }
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.profileInfo}>
              <h1 className={styles.name}>{profile.name}</h1>

              {profile.pronouns && (
                <div className={styles.fieldWrapper}>
                  <img
                    src={labelBanner1}
                    alt=""
                    className={styles.fieldBanner}
                  />
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>pronouns:</span>
                    <span className={styles.fieldValue}>
                      {profile.pronouns}
                    </span>
                  </div>
                </div>
              )}

              {profile.major && (
                <div className={styles.fieldWrapper}>
                  <img
                    src={labelBanner2}
                    alt=""
                    className={styles.fieldBanner}
                  />
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>major:</span>
                    <span className={styles.fieldValue}>{profile.major}</span>
                  </div>
                </div>
              )}

              {profile.status && (
                <div className={styles.fieldWrapper}>
                  <img
                    src={labelBanner3}
                    alt=""
                    className={styles.fieldBanner}
                  />
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>status:</span>
                    <span className={styles.fieldValue}>{profile.status}</span>
                  </div>
                </div>
              )}

              {profile.interests && profile.interests.length > 0 && (
                <div className={styles.fieldWrapper}>
                  <img
                    src={labelBanner1}
                    alt=""
                    className={styles.fieldBanner}
                  />
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>interests:</span>
                    <span className={styles.fieldValue}>
                      {profile.interests.join(", ")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {saveError && <p className={styles.saveError}>{saveError}</p>}

            <div className={styles.buttonRowTop}>
              <button
                type="button"
                className={styles.scanButton}
                onClick={() => setIsScannerOpen(true)}
              >
                scan a code
              </button>
              <button
                onClick={() => navigate("/user/game-scores")}
                className={styles.gameScoresButton}
              >
                game scores
              </button>
              <button
                onClick={() => navigate("/user/gallery")}
                className={styles.drawingsButton}
              >
                my drawings
              </button>
              <button
                onClick={() => navigate("/user/messages")}
                className={styles.messagesButton}
              >
                messages
              </button>
            </div>

            <div className={styles.buttonRowTop}>
              <button
                onClick={() => navigate("/user/customize")}
                className={styles.customizeButton}
              >
                customize avatar
              </button>
            </div>

            <div className={styles.buttonRowMid}>
              <button
                onClick={() => setMode("edit")}
                className={styles.editButton}
              >
                edit profile
              </button>
              <button onClick={handleSignOut} className={styles.signOutButton}>
                sign out
              </button>
            </div>

            {isConfirmingDelete ? (
              <div className={styles.confirmRow}>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className={styles.confirmDeleteButton}
                >
                  {isDeleting ? "deleting..." : "tap again to confirm"}
                </button>
                <button
                  onClick={() => {
                    setIsConfirmingDelete(false);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  className={styles.cancelDeleteButton}
                >
                  cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleDeleteAccount}
                className={styles.deleteButton}
              >
                delete account
              </button>
            )}

            {deleteError && <p className={styles.deleteError}>{deleteError}</p>}
          </div>
        </div>
      </div>
    </>
  );
};
