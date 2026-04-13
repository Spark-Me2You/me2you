/**
 * BobbleheadPreviewStep Component
 * Shows cropped head preview and asks user to opt-in to network.
 */

import React from 'react';
import styles from './RegistrationSteps.module.css';
// TODO: replace with next_button.svg / pink_back_arrow.svg / shanw.png when assets are available
import nextButtonImg from '../../../assets/arrow1.svg';
import pinkBackArrowImg from '../../../assets/arrow2.svg';
import shanwImg from '../../../assets/otter.png';

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

        {/* Shanw decorative character — absolute positioned */}
        <img src={shanwImg} alt="" className={styles.bobbleheadShanw} />

        {/* Blue box question */}
        <div className={styles.bobbleheadQuestionWrapper}>
          <p className={styles.bobbleheadQuestion}>
            would you like to be added to our network?
          </p>
        </div>

        {/* Action buttons: pink (no thanks, left) + lime (yes, right) */}
        <div className={styles.bobbleheadActions}>
          <button
            type="button"
            className={styles.bobbleheadBtnNo}
            onClick={handleNo}
            disabled={isSubmitting}
          >
            <img src={pinkBackArrowImg} alt="" className={styles.bobbleheadBtnIcon} />
            <span className={styles.bobbleheadBtnLabel}>no thanks</span>
          </button>

          <button
            type="button"
            className={styles.bobbleheadBtnYes}
            onClick={handleYes}
            disabled={isSubmitting}
          >
            <img src={nextButtonImg} alt="" className={styles.bobbleheadBtnIcon} />
            <span className={styles.bobbleheadBtnLabel}>YES!</span>
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
