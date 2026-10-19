import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth";
import { profileService } from "@/features/profile-editor/services/profileService";
import type {
  ProfileWithImage,
  UpdateProfileInput,
  GestureCategory,
} from "@/features/profile-editor/types/profileTypes";
import { accessoryService } from "@/features/profile-editor/services/accessoryService";
import type { AccessorySettings } from "@/features/profile-editor/types/profileTypes";
import { DEFAULT_ACCESSORY_SETTINGS } from "@/features/profile-editor/types/profileTypes";
import logo from "@/assets/me2you.png";
import labelBanner1 from "@/assets/label_banner1.svg";
import labelBanner2 from "@/assets/label_banner2b.svg";
import labelBanner3 from "@/assets/label_banner3.svg";
import { UserProfileEditForm } from "./UserProfileEditForm";
import { UserPhotoCaptureModal } from "./UserPhotoCaptureModal";
import { UserMiiPixiPreview } from "./UserMiiPixiPreview";
import { ClaimScanner } from "@/features/claim";

const TAB =
  "flex-1 cursor-pointer border-0 border-r-2 border-solid border-[#e44805] px-1 py-2 font-jersey text-[16px] tracking-[1px] lowercase [transition:background_0.2s,color_0.2s] last:border-r-0";
const TAB_ACTIVE = "bg-[#e44805] text-white";
const TAB_IDLE = "bg-[rgba(228,72,5,0.08)] text-[#e44805] hover:bg-[rgba(228,72,5,0.15)]";
const BTN =
  "cursor-pointer rounded-[14px] font-jersey tracking-[1px] lowercase [transition:background_0.2s,transform_0.1s] active:[transform:scale(0.98)]";
const OUTLINE_BTN = `${BTN} border-2 border-solid px-[10px] py-4 text-[18px]`;
const FIELD_WRAPPER =
  "relative py-[6px] before:absolute before:top-[10px] before:left-[-6px] before:z-[2] before:h-[10px] before:w-[40px] before:rotate-[-25deg] before:rounded-[2px] before:bg-[rgba(220,210,60,0.8)] after:absolute after:right-[-6px] after:bottom-[10px] after:z-[2] after:h-[10px] after:w-[40px] after:rotate-[-18deg] after:rounded-[2px] after:bg-[rgba(220,210,60,0.8)]";

export const UserProfileView: React.FC = () => {
  const navigate = useNavigate();
  const { signOut, setUserProfile, session } = useAuth();
  const currentUserId = session?.user.id ?? null;

  const [profileData, setProfileData] = useState<ProfileWithImage | null>(null);
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
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const profileLoadRequestIdRef = useRef(0);
  const accessoryLoadRequestIdRef = useRef(0);
  const saveRequestIdRef = useRef(0);
  const profileLoadTimeoutRef = useRef<number | null>(null);

  const clearProfileLoadTimeout = useCallback(() => {
    if (profileLoadTimeoutRef.current !== null) {
      window.clearTimeout(profileLoadTimeoutRef.current);
      profileLoadTimeoutRef.current = null;
    }
  }, []);

  const loadCoreProfile = useCallback(
    async (options?: { setLoading?: boolean }) => {
      const setLoading = options?.setLoading ?? true;
      const requestId = ++profileLoadRequestIdRef.current;

      if (setLoading) {
        setIsLoading(true);
        setProfileLoadError(null);
        clearProfileLoadTimeout();
        profileLoadTimeoutRef.current = window.setTimeout(() => {
          if (
            mountedRef.current &&
            requestId === profileLoadRequestIdRef.current
          ) {
            console.warn("[UserProfileView] Profile load timed out");
            setIsLoading(false);
            setProfileLoadError("profile is taking too long to load. try again.");
          }
        }, 12000);
      }

      try {
        const data = await profileService.getCurrentProfile({ userId: currentUserId });

        if (!mountedRef.current || requestId !== profileLoadRequestIdRef.current) {
          return;
        }

        setProfileData(data);
      } catch (err) {
        if (!mountedRef.current || requestId !== profileLoadRequestIdRef.current) {
          return;
        }

        console.error("[UserProfileView] Failed to load profile:", err);
      } finally {
        clearProfileLoadTimeout();
        if (
          setLoading &&
          mountedRef.current &&
          requestId === profileLoadRequestIdRef.current
        ) {
          setIsLoading(false);
        }
      }
    },
    [clearProfileLoadTimeout, currentUserId],
  );

  const loadAccessorySettings = useCallback(async () => {
    if (!currentUserId) {
      setAccessorySettings(DEFAULT_ACCESSORY_SETTINGS);
      return;
    }

    const requestId = ++accessoryLoadRequestIdRef.current;

    try {
      const settings = await accessoryService.getAccessorySettings(currentUserId);

      if (!mountedRef.current || requestId !== accessoryLoadRequestIdRef.current) {
        return;
      }

      setAccessorySettings(settings);
    } catch (err) {
      if (!mountedRef.current || requestId !== accessoryLoadRequestIdRef.current) {
        return;
      }

      console.warn("[UserProfileView] Failed to load accessory settings:", err);
      setAccessorySettings(DEFAULT_ACCESSORY_SETTINGS);
    }
  }, [currentUserId]);

  useEffect(() => {
    mountedRef.current = true;
    void loadCoreProfile();
    void loadAccessorySettings();

    return () => {
      mountedRef.current = false;
      clearProfileLoadTimeout();
    };
  }, [clearProfileLoadTimeout, loadCoreProfile, loadAccessorySettings]);

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

      void loadCoreProfile({ setLoading: false }).catch((refreshError) => {
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
      <div className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[linear-gradient(to_bottom,#58e7f7_0%,#fefffb_100%)]">
        <img src={logo} alt="me2you" className="pointer-events-none absolute top-[7px] left-1/2 z-[100] w-[270px] origin-top -translate-x-1/2 rotate-[3.41deg] select-none" />
        <div className="flex min-h-0 flex-1 flex-col items-center overflow-x-hidden overflow-y-auto px-[30px] pt-[120px] pb-[60px] [-webkit-overflow-scrolling:touch] before:min-h-0 before:flex-[1_0_0] after:min-h-0 after:flex-[1_0_0]">
          <div className="w-full max-w-[350px] shrink-0 rounded-[24px] bg-glass px-[30px] py-10 shadow-glass backdrop-brightness-98 backdrop-hue-rotate-10 backdrop-saturate-105">
            <div>
              <span className="font-jersey text-[14px] text-[rgba(255,255,255,0.9)] lowercase">loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    if (profileLoadError) {
      return (
        <div className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[linear-gradient(to_bottom,#58e7f7_0%,#fefffb_100%)]">
          <img src={logo} alt="me2you" className="pointer-events-none absolute top-[7px] left-1/2 z-[100] w-[270px] origin-top -translate-x-1/2 rotate-[3.41deg] select-none" />
          <div className="flex min-h-0 flex-1 flex-col items-center overflow-x-hidden overflow-y-auto px-[30px] pt-[120px] pb-[60px] [-webkit-overflow-scrolling:touch] before:min-h-0 before:flex-[1_0_0] after:min-h-0 after:flex-[1_0_0]">
            <div className="w-full max-w-[350px] shrink-0 rounded-[24px] bg-glass px-[30px] py-10 shadow-glass backdrop-brightness-98 backdrop-hue-rotate-10 backdrop-saturate-105">
              <div>
                <span className="font-jersey text-[14px] text-[rgba(255,255,255,0.9)] lowercase">{profileLoadError}</span>
                <button
                  type="button"
                  className={`${BTN} col-span-full border-2 border-solid border-[#7105e4] bg-[rgba(113,5,228,0.08)] px-[14px] py-5 text-[20px] text-[#7105e4] hover:bg-[rgba(113,5,228,0.16)]`}
                  onClick={() => {
                    setProfileLoadError(null);
                    void loadCoreProfile();
                    void loadAccessorySettings();
                  }}
                >
                  retry
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  if (mode === "edit") {
    return (
      <>
        <UserProfileEditForm
          initialData={profileData}
          gestureImageUrl={profileData.imageUrl}
          accessorySettings={accessorySettings}
          bobbleheadLandmarks={profileData.bobbleheadLandmarks}
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
      <div className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[linear-gradient(to_bottom,#58e7f7_0%,#fefffb_100%)]">
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

        <img src={logo} alt="me2you" className="pointer-events-none absolute top-[7px] left-1/2 z-[100] w-[270px] origin-top -translate-x-1/2 rotate-[3.41deg] select-none" />

        <div className="flex min-h-0 flex-1 flex-col items-center overflow-x-hidden overflow-y-auto px-[30px] pt-[120px] pb-[60px] [-webkit-overflow-scrolling:touch] before:min-h-0 before:flex-[1_0_0] after:min-h-0 after:flex-[1_0_0]">
          <div className="w-full max-w-[350px] shrink-0 rounded-[24px] bg-glass px-[30px] py-10 shadow-glass backdrop-brightness-98 backdrop-hue-rotate-10 backdrop-saturate-105">
            <div className="mx-auto mb-6 flex aspect-square w-full max-w-[260px] flex-col overflow-hidden rounded-[16px] border-[3px] border-solid border-[#e44805] bg-white">
              <div className="flex w-full shrink-0 border-b-2 border-solid border-[#e44805]">
                <button
                  type="button"
                  className={`${TAB} ${activeTab === "picture" ? TAB_ACTIVE : TAB_IDLE}`}
                  onClick={() => setActiveTab("picture")}
                >
                  my picture
                </button>
                <button
                  type="button"
                  className={`${TAB} ${activeTab === "mii" ? TAB_ACTIVE : TAB_IDLE}`}
                  onClick={() => setActiveTab("mii")}
                >
                  my mii
                </button>
              </div>
              <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[linear-gradient(45deg,#eee_25%,transparent_25%),linear-gradient(-45deg,#eee_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eee_75%),linear-gradient(-45deg,transparent_75%,#eee_75%)] [background-position:0_0,0_8px,8px_-8px,-8px_0] [background-size:16px_16px]">
                {activeTab === "picture" ? (
                  profileData.imageUrl ? (
                    <img
                      src={profileData.imageUrl}
                      alt={profile.name}
                      className="block h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#e44805,#d3e405)]">
                      <span className="font-jersey text-[72px] text-white uppercase">
                        {profile.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )
                ) : (
                  <UserMiiPixiPreview
                    className="relative h-full w-full bg-[#fefffb]"
                    bobbleheadUrl={profileData.bobbleheadUrl}
                    accessorySettings={accessorySettings}
                    landmarks={profileData.bobbleheadLandmarks}
                  />
                )}
              </div>
            </div>

            <div className="mb-[30px] flex flex-col gap-4">
              <h1 className="m-0 text-center font-jersey text-[42px] tracking-[2px] text-[#e44805] lowercase">{profile.name}</h1>

              {profile.pronouns && (
                <div className={FIELD_WRAPPER}>
                  <img
                    src={labelBanner1}
                    alt=""
                    className="pointer-events-none absolute inset-x-0 inset-y-[6px] z-0 h-[calc(100%-12px)] w-full select-none"
                  />
                  <div className="relative z-[1] flex flex-col items-center gap-1 px-4 py-3 text-center">
                    <span className="font-jersey text-[18px] tracking-[1px] text-[#444] lowercase">pronouns:</span>
                    <span className="font-jersey text-[22px] leading-[1.4] text-[#111]">
                      {profile.pronouns}
                    </span>
                  </div>
                </div>
              )}

              {profile.major && (
                <div className={FIELD_WRAPPER}>
                  <img
                    src={labelBanner2}
                    alt=""
                    className="pointer-events-none absolute inset-x-0 inset-y-[6px] z-0 h-[calc(100%-12px)] w-full select-none"
                  />
                  <div className="relative z-[1] flex flex-col items-center gap-1 px-4 py-3 text-center">
                    <span className="font-jersey text-[18px] tracking-[1px] text-[#444] lowercase">major:</span>
                    <span className="font-jersey text-[22px] leading-[1.4] text-[#111]">{profile.major}</span>
                  </div>
                </div>
              )}

              {profile.status && (
                <div className={FIELD_WRAPPER}>
                  <img
                    src={labelBanner3}
                    alt=""
                    className="pointer-events-none absolute inset-x-0 inset-y-[6px] z-0 h-[calc(100%-12px)] w-full select-none"
                  />
                  <div className="relative z-[1] flex flex-col items-center gap-1 px-4 py-3 text-center">
                    <span className="font-jersey text-[18px] tracking-[1px] text-[#444] lowercase">status:</span>
                    <span className="font-jersey text-[22px] leading-[1.4] text-[#111]">{profile.status}</span>
                  </div>
                </div>
              )}

              {profile.interests && profile.interests.length > 0 && (
                <div className={FIELD_WRAPPER}>
                  <img
                    src={labelBanner1}
                    alt=""
                    className="pointer-events-none absolute inset-x-0 inset-y-[6px] z-0 h-[calc(100%-12px)] w-full select-none"
                  />
                  <div className="relative z-[1] flex flex-col items-center gap-1 px-4 py-3 text-center">
                    <span className="font-jersey text-[18px] tracking-[1px] text-[#444] lowercase">interests:</span>
                    <span className="font-jersey text-[22px] leading-[1.4] text-[#111]">
                      {profile.interests.join(", ")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {saveError && <p className="m-0 mb-3 text-center font-jersey text-[15px] text-[#d32f2f]">{saveError}</p>}

            <div className="mb-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`${OUTLINE_BTN} border-[#2e7d32] bg-[rgba(46,125,50,0.1)] text-[#2e7d32] hover:bg-[rgba(46,125,50,0.2)]`}
                onClick={() => setIsScannerOpen(true)}
              >
                scan a code
              </button>
              <button
                onClick={() => navigate("/user/game-scores")}
                className={`${OUTLINE_BTN} border-[#1e88e5] bg-[rgba(30,136,229,0.1)] text-[#1e88e5] hover:bg-[rgba(30,136,229,0.2)]`}
              >
                game scores
              </button>
              <button
                onClick={() => navigate("/user/gallery")}
                className={`${OUTLINE_BTN} border-[#e91e63] bg-[rgba(233,30,99,0.1)] text-[#e91e63] hover:bg-[rgba(233,30,99,0.2)]`}
              >
                my drawings
              </button>
              <button
                onClick={() => navigate("/user/messages")}
                className={`${OUTLINE_BTN} border-[#7b1fa2] bg-[rgba(123,31,162,0.1)] text-[#7b1fa2] hover:bg-[rgba(123,31,162,0.2)]`}
              >
                messages
              </button>
            </div>

            <div className="mb-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate("/user/customize")}
                className={`${BTN} col-span-full border-2 border-solid border-[#7105e4] bg-[rgba(113,5,228,0.08)] px-[14px] py-5 text-[20px] text-[#7105e4] hover:bg-[rgba(113,5,228,0.16)]`}
              >
                customize avatar
              </button>
            </div>

            <div className="mb-2 flex gap-2">
              <button
                onClick={() => setMode("edit")}
                className={`${BTN} flex-2 border-2 border-solid border-[#e44805] bg-[#e44805] px-[14px] py-5 text-[22px] text-white hover:bg-[#c53d04]`}
              >
                edit profile
              </button>
              <button onClick={handleSignOut} className={`${BTN} flex-1 border-0 bg-[#d32f2f] px-[14px] py-5 text-[20px] text-white hover:bg-[#b71c1c]`}>
                sign out
              </button>
            </div>

            {isConfirmingDelete ? (
              <div className="mt-0 flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className={`${BTN} flex-2 border-0 bg-[#b71c1c] p-[10px] text-[18px] text-white hover:enabled:bg-[#8b0000] active:enabled:[transform:scale(0.98)] disabled:cursor-not-allowed disabled:bg-[#c8a0a0]`}
                >
                  {isDeleting ? "deleting..." : "tap again to confirm"}
                </button>
                <button
                  onClick={() => {
                    setIsConfirmingDelete(false);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  className={`${BTN} flex-1 border-2 border-solid border-[#ccc] bg-[rgba(0,0,0,0.05)] p-[10px] text-[18px] text-[#666] hover:enabled:bg-[rgba(0,0,0,0.1)] disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleDeleteAccount}
                className="mt-0 w-full cursor-pointer rounded-[14px] border-2 border-solid border-[#b71c1c] bg-[rgba(183,28,28,0.05)] bg-[repeating-linear-gradient(-45deg,rgba(183,28,28,0.25)_0px,rgba(183,28,28,0.25)_2px,transparent_2px,transparent_12px)] p-[10px] font-jersey text-[20px] tracking-[1px] text-[#b71c1c] lowercase [transition:background-color_0.2s,transform_0.1s] hover:bg-[rgba(183,28,28,0.18)] active:[transform:scale(0.98)]"
              >
                delete account
              </button>
            )}

            {deleteError && <p className="m-0 mt-2 text-center font-jersey text-[15px] text-[#b71c1c]">{deleteError}</p>}
          </div>
        </div>
      </div>
    </>
  );
};
