import React, { useState } from 'react';
import logo from '@/assets/me2you.png';
import type {
  AccessorySettings,
  AvatarLandmarkPoints,
  ProfileWithImage,
  UpdateProfileInput,
} from '@/features/profile-editor/types/profileTypes';
import { DEFAULT_ACCESSORY_SETTINGS } from '@/features/profile-editor/types/profileTypes';
import { UserMiiPixiPreview } from './UserMiiPixiPreview';

const FIELD = 'flex flex-col gap-[6px]';
const LABEL = 'font-jersey text-[20px] tracking-[1px] text-[#333] lowercase';
const INPUT =
  'box-border w-full rounded-[12px] border-2 border-solid border-[rgba(0,0,0,0.1)] bg-[rgba(255,255,255,0.9)] px-[14px] py-[10px] font-jersey text-[20px] text-[#111] transition-[border-color] duration-200 focus:border-[#e44805] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60';
const TAB =
  'flex-1 cursor-pointer border-0 border-r-2 border-solid border-[#e44805] px-1 py-2 font-jersey text-[16px] tracking-[1px] lowercase [transition:background_0.2s,color_0.2s] last:border-r-0';
const TAB_ACTIVE = 'bg-[#e44805] text-white';
const TAB_IDLE = 'bg-[rgba(228,72,5,0.08)] text-[#e44805] hover:bg-[rgba(228,72,5,0.15)]';
const HINT = 'font-jersey text-[14px]';
const ACTION_BTN =
  'flex-1 cursor-pointer rounded-[14px] p-3 font-jersey tracking-[1px] lowercase [transition:background_0.2s,transform_0.1s] active:enabled:[transform:scale(0.98)] disabled:cursor-not-allowed disabled:opacity-60';

interface UserProfileEditFormProps {
  initialData: ProfileWithImage;
  gestureImageUrl?: string | null;
  accessorySettings?: AccessorySettings;
  bobbleheadLandmarks?: AvatarLandmarkPoints | null;
  onSave: (data: UpdateProfileInput) => Promise<void>;
  onCancel: () => void;
  onChangePhoto: () => void;
  isSubmitting: boolean;
  error: string | null;
}

export const UserProfileEditForm: React.FC<UserProfileEditFormProps> = ({
  initialData,
  gestureImageUrl = null,
  accessorySettings = DEFAULT_ACCESSORY_SETTINGS,
  bobbleheadLandmarks = null,
  onSave,
  onCancel,
  onChangePhoto,
  isSubmitting,
  error,
}) => {
  const [activeTab, setActiveTab] = useState<'picture' | 'mii'>('picture');
  const [name, setName] = useState(initialData.profile.name || '');
  const [status, setStatus] = useState(initialData.profile.status || '');
  const [pronouns, setPronouns] = useState(initialData.profile.pronouns || '');
  const [major, setMajor] = useState(initialData.profile.major || '');
  const [interests, setInterests] = useState(
    initialData.profile.interests?.join(', ') || ''
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const validate = (): boolean => {
    setLocalError(null);
    if (!name.trim()) {
      setLocalError('name is required');
      return false;
    }
    if (name.length > 60) {
      setLocalError('name must be 60 characters or less');
      return false;
    }
    if (status.length > 150) {
      setLocalError('status must be 150 characters or less');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const updates: UpdateProfileInput = {
      name,
      status: status || null,
      pronouns: pronouns || null,
      major: major || null,
      interests: interests
        ? interests
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : null,
    };

    await onSave(updates);
  };

  const displayError = localError || error;

  return (
    <div className="relative mx-auto flex h-screen w-full max-w-[430px] flex-col overflow-hidden bg-[linear-gradient(to_bottom,#58e7f7_0%,#fefffb_100%)]">
      <img src={logo} alt="me2you" className="pointer-events-none absolute top-[7px] left-1/2 z-20 w-[270px] origin-top -translate-x-1/2 rotate-[3.41deg] select-none" />

      <div className="flex min-h-0 flex-1 flex-col items-center overflow-x-hidden overflow-y-auto px-[30px] pt-[120px] pb-[40px] [-webkit-overflow-scrolling:touch]">
        <div className="w-full max-w-[350px] shrink-0 rounded-[24px] bg-glass px-6 py-[30px] shadow-glass backdrop-brightness-98 backdrop-hue-rotate-10 backdrop-saturate-105">
          <h2 className="m-0 mb-6 text-center font-jersey text-[36px] tracking-[2px] text-[#e44805] lowercase">edit profile</h2>

          <div className="mx-auto mb-4 flex aspect-square w-full max-w-[260px] flex-col overflow-hidden rounded-[16px] border-[3px] border-solid border-[#e44805] bg-white">
            <div className="flex w-full shrink-0 border-b-2 border-solid border-[#e44805]">
              <button
                type="button"
                className={`${TAB} ${activeTab === 'picture' ? TAB_ACTIVE : TAB_IDLE}`}
                onClick={() => setActiveTab('picture')}
              >
                my picture
              </button>
              <button
                type="button"
                className={`${TAB} ${activeTab === 'mii' ? TAB_ACTIVE : TAB_IDLE}`}
                onClick={() => setActiveTab('mii')}
              >
                my mii
              </button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[linear-gradient(45deg,#eee_25%,transparent_25%),linear-gradient(-45deg,#eee_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eee_75%),linear-gradient(-45deg,transparent_75%,#eee_75%)] [background-position:0_0,0_8px,8px_-8px,-8px_0] [background-size:16px_16px]">
              {activeTab === 'picture' ? (
                gestureImageUrl || initialData.imageUrl ? (
                  <img
                    src={gestureImageUrl ?? initialData.imageUrl ?? ''}
                    alt="profile"
                    className="block h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#e44805,#d3e405)] font-jersey text-[18px] text-white lowercase">no photo</div>
                )
              ) : (
                <UserMiiPixiPreview
                  className="relative h-full w-full bg-[#fefffb]"
                  bobbleheadUrl={initialData.bobbleheadUrl}
                  accessorySettings={accessorySettings}
                  landmarks={bobbleheadLandmarks}
                />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onChangePhoto}
            disabled={isSubmitting}
            className="mx-auto mb-2 block cursor-pointer rounded-[12px] border-2 border-solid border-[#e44805] bg-[rgba(228,72,5,0.1)] px-5 py-[10px] font-jersey text-[20px] tracking-[1px] text-[#e44805] lowercase [transition:background_0.2s,transform_0.1s] hover:enabled:bg-[rgba(228,72,5,0.2)] active:enabled:[transform:scale(0.98)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            change photo
          </button>
          <p className="m-0 mb-5 text-center font-jersey text-[14px] text-[#777] italic">
            changing your photo also regenerates your bobblehead
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {displayError && (
              <div className="rounded-[10px] bg-[rgba(211,47,47,0.1)] px-[14px] py-[10px] text-center font-jersey text-[16px] text-[#d32f2f]">{displayError}</div>
            )}

            <div className={FIELD}>
              <label htmlFor="name" className={LABEL}>
                name <span className="text-[#d32f2f]">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                disabled={isSubmitting}
                className={INPUT}
                placeholder="your name"
              />
              <span className={`${HINT} text-right text-[#888]`}>{name.length}/60</span>
            </div>

            <div className={FIELD}>
              <label htmlFor="status" className={LABEL}>
                status
              </label>
              <textarea
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                maxLength={150}
                disabled={isSubmitting}
                className={`${INPUT} min-h-[70px] resize-y`}
                placeholder="what's on your mind?"
                rows={3}
              />
              <span className={`${HINT} text-right text-[#888]`}>{status.length}/150</span>
            </div>

            <div className={FIELD}>
              <label htmlFor="pronouns" className={LABEL}>
                pronouns
              </label>
              <input
                id="pronouns"
                type="text"
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                disabled={isSubmitting}
                className={INPUT}
                placeholder="she/her, he/him, they/them"
              />
            </div>

            <div className={FIELD}>
              <label htmlFor="major" className={LABEL}>
                major
              </label>
              <input
                id="major"
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                disabled={isSubmitting}
                className={INPUT}
                placeholder="computer science"
              />
            </div>

            <div className={FIELD}>
              <label htmlFor="interests" className={LABEL}>
                interests
              </label>
              <input
                id="interests"
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                disabled={isSubmitting}
                className={INPUT}
                placeholder="art, music, coding"
              />
              <span className={`${HINT} text-[#666] italic`}>separate with commas</span>
            </div>

            <div className="mt-5 flex gap-[10px]">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className={`${ACTION_BTN} border-2 border-solid border-[rgba(0,0,0,0.15)] bg-[rgba(255,255,255,0.7)] text-[22px] text-[#666] hover:enabled:bg-[rgba(255,255,255,0.9)]`}
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`${ACTION_BTN} border-0 bg-[#e44805] text-[24px] tracking-[2px] text-white hover:enabled:bg-[#cc4004]`}
              >
                {isSubmitting ? 'saving...' : 'save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
