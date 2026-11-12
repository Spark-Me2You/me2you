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
}

export const PhotoStep: React.FC<PhotoStepProps> = ({
  onSubmit,
  onBack,
  isSubmitting,
  error,
  onClearError,
}) => (
  <PoseCapture
    onSubmit={onSubmit}
    onBack={onBack}
    isSubmitting={isSubmitting}
    error={error}
    onClearError={onClearError}
  />
);
