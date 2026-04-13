/**
 * ProfileStep Component — Figma "profile-creation" screen
 */

import React, { useState, useEffect } from 'react';
import styles from './RegistrationSteps.module.css';
import { GoBackWarning } from './GoBackWarning';
import pinkBackArrowImg from '../../../assets/pink_back_arrow.svg';
import nextButtonImg from '../../../assets/next_button.svg';
import type { RegistrationFormData } from '../services/registrationService';

interface ProfileStepProps {
  formData: Partial<RegistrationFormData>;
  onUpdateFormData: (data: Partial<RegistrationFormData>) => void;
  onSubmit: () => Promise<boolean>;
  onBack: () => void;
  isSubmitting: boolean;
  error: string | null;
  onClearError: () => void;
}

export const ProfileStep: React.FC<ProfileStepProps> = ({
  formData,
  onUpdateFormData,
  onSubmit,
  onBack,
  isSubmitting,
  error,
  onClearError,
}) => {
  const [name, setName] = useState(formData.name || '');
  const [pronouns, setPronouns] = useState(formData.pronouns || '');
  const [major, setMajor] = useState(formData.major || '');
  const [status, setStatus] = useState(formData.status || '');
  const [interests, setInterests] = useState(formData.interests?.join(', ') || '');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    onUpdateFormData({
      name,
      pronouns: pronouns || undefined,
      major: major || undefined,
      status: status || undefined,
      interests: interests
        ? interests
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    });
  }, [name, pronouns, major, status, interests, onUpdateFormData]);

  const validateForm = (): boolean => {
    setLocalError(null);
    onClearError();
    if (!name.trim()) {
      setLocalError('name is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    await onSubmit();
  };

  const handleGoBack = () => setShowWarning(true);
  const handleConfirmGoBack = () => { setShowWarning(false); onBack(); };
  const handleCancelGoBack = () => setShowWarning(false);

  const displayError = localError || error;

  return (
    <>
      <div className={styles.profileWrapper}>
        <div className={styles.profileTab}>
          <p className={styles.profileTabText}>profile creation</p>
        </div>

        <div className={styles.profileCard}>
          <form onSubmit={handleSubmit} noValidate>
            {displayError && (
              <div className={styles.errorBanner}>{displayError}</div>
            )}

            <div className={styles.profileFieldGroup}>
              <label htmlFor="pf-name" className={styles.profileFieldLabel}>name:</label>
              <input
                id="pf-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.fieldInputWhite}
                placeholder="type here"
                disabled={isSubmitting}
                autoCapitalize="words"
              />
            </div>

            <div className={styles.profileFieldGroup}>
              <label htmlFor="pf-pronouns" className={styles.profileFieldLabel}>pronouns:</label>
              <input
                id="pf-pronouns"
                type="text"
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                className={styles.fieldInputWhite}
                placeholder="type here"
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.profileFieldGroup}>
              <label htmlFor="pf-major" className={styles.profileFieldLabel}>major/title:</label>
              <input
                id="pf-major"
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                className={styles.fieldInputWhite}
                placeholder="type here"
                disabled={isSubmitting}
              />
            </div>

            {/* bio maps to status field */}
            <div className={styles.profileFieldGroup}>
              <label htmlFor="pf-bio" className={styles.profileFieldLabel}>bio:</label>
              <textarea
                id="pf-bio"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={styles.fieldTextarea}
                placeholder="type here"
                disabled={isSubmitting}
                rows={4}
              />
            </div>

            <div className={styles.profileFieldGroup}>
              <label htmlFor="pf-interests" className={styles.profileFieldLabel}>interests:</label>
              <textarea
                id="pf-interests"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className={styles.fieldTextarea}
                placeholder="type here"
                disabled={isSubmitting}
                rows={4}
              />
            </div>

            <div className={styles.profileNavRow}>
              <button
                type="button"
                className={styles.profileBackBtn}
                onClick={handleGoBack}
                disabled={isSubmitting}
                aria-label="go back"
              >
                <img src={pinkBackArrowImg} alt="back" className={styles.nextBtnImg} />
              </button>

              <button
                type="submit"
                className={styles.nextBtn}
                disabled={isSubmitting}
              >
                <img src={nextButtonImg} alt="next" className={styles.nextBtnImg} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {showWarning && (
        <GoBackWarning
          onConfirm={handleConfirmGoBack}
          onCancel={handleCancelGoBack}
        />
      )}
    </>
  );
};
