/**
 * PhotoStep Component — Figma "profile-picture-capture" screen
 * Step order: signup → photo → profile → success
 * "Looks good" uploads photo and advances to profile.
 *
 * The camera screen itself is the shared PoseCapture, which updating a photo
 * from the profile page reuses.
 */

import React from 'react';
import { PoseCapture } from '@/features/profile-editor/components/PoseCapture';
import type { GestureCategory } from '@/features/profile-editor/types/profileTypes';

export type { GestureCategory };

interface PhotoStepProps {
  onSubmit: (photo: Blob | null, category: GestureCategory) => Promise<boolean>;
  onBack: () => void;
  isSubmitting: boolean;
  error: string | null;
  onClearError: () => void;
  /** Offered when the photo is saved but no face was found. */
  onSkipAvatar?: () => void;
}

export const PhotoStep: React.FC<PhotoStepProps> = ({
  onSubmit,
  onBack,
  isSubmitting,
  error,
  onClearError,
  onSkipAvatar,
}) => (
  <PoseCapture
    onSubmit={onSubmit}
    onBack={onBack}
    isSubmitting={isSubmitting}
    error={error}
    onClearError={onClearError}
  >
    {onSkipAvatar && (
      <button
        type="button"
        className="mx-auto mt-6 flex cursor-pointer border-0 bg-transparent px-4 py-2 font-jersey text-[20px] tracking-[3px] text-ink lowercase underline disabled:cursor-not-allowed disabled:opacity-40"
        onClick={onSkipAvatar}
        disabled={isSubmitting}
      >
        continue without avatar
      </button>
    )}
  </PoseCapture>
);
