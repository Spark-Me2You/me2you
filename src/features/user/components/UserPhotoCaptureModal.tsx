import React from "react";
import { PoseCapture } from "@/features/profile-editor/components/PoseCapture";
import type { GestureCategory } from "@/features/profile-editor/types/profileTypes";
import logo from "@/assets/me2you.png";

interface UserPhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photo: Blob, category: GestureCategory) => Promise<void>;
  isSubmitting: boolean;
  /** Save error from the profile page (upload failed, etc.). */
  error?: string | null;
}

/**
 * Update-photo screen. Full screen and identical to the photo step of
 * account creation (both render PoseCapture), so retaking a photo later
 * looks and works the same as the first time.
 */
export const UserPhotoCaptureModal: React.FC<UserPhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  isSubmitting,
  error,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] overflow-x-hidden overflow-y-auto overscroll-contain bg-page-gradient"
      role="dialog"
      aria-modal="true"
      aria-label="update photo"
    >
      <div className="relative mx-auto w-full max-w-[430px]">
        <img
          src={logo}
          alt="me2you"
          className="pointer-events-none absolute top-[30px] left-1/2 z-20 w-[270px] origin-top -translate-x-1/2 rotate-[2deg] scale-[1.3] select-none"
        />
        <PoseCapture
          onSubmit={onCapture}
          onBack={onClose}
          backLabel="cancel"
          isSubmitting={isSubmitting}
          error={error}
        />
      </div>
    </div>
  );
};
