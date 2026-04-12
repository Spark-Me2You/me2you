/**
 * BobbleheadPreviewStep Component
 * Shows cropped head preview and asks user to opt-in to network
 * Step order: signup → profile → photo → bobblehead → success
 */

import React from 'react';
import styles from './RegistrationSteps.module.css';
import thumbsUpImg from '../../../assets/thumbsUP.png';

export interface BobbleheadPreviewStepProps {
  croppedPhotoUrl: string;
  onSubmit: (joinNetwork: boolean) => Promise<boolean>;
  onRetake: () => void;
  isSubmitting: boolean;
  error: string | null;
  onClearError: () => void;
}

export const BobbleheadPreviewStep: React.FC<BobbleheadPreviewStepProps> = ({
  croppedPhotoUrl,
  onSubmit,
  onRetake,
  isSubmitting,
  error,
  onClearError,
}) => {
  const handleYes = async () => {
    onClearError();
    await onSubmit(true);
  };

  const handleNo = async () => {
    onClearError();
    await onSubmit(false);
  };

  return (
    <div className={styles.bobbleheadWrapper}>
      <div className={styles.bobbleheadCard}>
        {error && (
          <div className={styles.errorBanner}>{error}</div>
        )}

        {/* Preview area with checkered background */}
        <div className={styles.bobbleheadPreviewArea}>
          <div className={styles.bobbleheadPreviewInner}>
            <img
              src={croppedPhotoUrl}
              alt="Your bobblehead"
              className={styles.bobbleheadPreviewImage}
            />
          </div>
        </div>

        {/* Question */}
        <h2 className={styles.bobbleheadQuestion}>
          would you like to be added to our network?
        </h2>

        {/* Action buttons */}
        <div className={styles.bobbleheadActions}>
          <button
            type="button"
            className={styles.bobbleheadBtnYes}
            onClick={handleYes}
            disabled={isSubmitting}
          >
            <img src={thumbsUpImg} alt="" className={styles.bobbleheadBtnIcon} />
            YES!
          </button>

          <button
            type="button"
            className={styles.bobbleheadBtnNo}
            onClick={handleNo}
            disabled={isSubmitting}
          >
            no thanks
          </button>
        </div>

        {/* Retake link */}
        <button
          type="button"
          className={styles.bobbleheadRetakeLink}
          onClick={onRetake}
          disabled={isSubmitting}
        >
          retake photo
        </button>
      </div>
    </div>
  );
};
