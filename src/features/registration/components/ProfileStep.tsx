/**
 * ProfileStep Component — Figma "profile-creation-1 + 2" (single scrollable page)
 */

import React, { useState, useEffect } from 'react';
import styles from './RegistrationSteps.module.css';
import { GoBackWarning } from './GoBackWarning';
import backfingerImg from '../../../assets/backfinger.png';
import thumbsUpImg from '../../../assets/thumbsUP.png';
import type { RegistrationFormData } from '../services/registrationService';

interface ProfileStepProps {
  formData: Partial<RegistrationFormData>;
  onUpdateFormData: (data: Partial<RegistrationFormData>) => void;
  onSubmit: () => Promise<boolean>;
  onBack: () => void;
  isSubmitting: boolean;
  error: string | null;
  onClearError: () => void;
  capturedPhoto?: Blob;
}

export const ProfileStep: React.FC<ProfileStepProps> = ({
  formData,
  onUpdateFormData,
  onSubmit,
  onBack,
  isSubmitting,
  error,
  onClearError,
  capturedPhoto,
}) => {
  const [name, setName] = useState(formData.name || '');
  const [pronouns, setPronouns] = useState(formData.pronouns || '');
  const [major, setMajor] = useState(formData.major || '');
  const [status, setStatus] = useState(formData.status || '');
  const [interests, setInterests] = useState(formData.interests?.join(', ') || '');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!capturedPhoto) return;
    const url = URL.createObjectURL(capturedPhoto);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [capturedPhoto]);

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

  const handleGoBack = () => {
    setShowWarning(true);
  };

  const handleConfirmGoBack = () => {
    setShowWarning(false);
    onBack();
  };

  const handleCancelGoBack = () => {
    setShowWarning(false);
  };

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

            {/* ── PART 1: photo placeholder + name / pronouns / major ── */}

            <div className={styles.photoPlaceholderWrapper}>
              <div className={styles.photoPlaceholderBox}>
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Your photo"
                    className={styles.photoPlaceholderImg}
                  />
                ) : (
                  <div className={styles.photoPlaceholderEmpty}>
                    {/* Empty placeholder - photo taken in next step */}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.fieldGroupLeft}>
              <div className={styles.fieldLabelLeftWrapper}>
                <p className={styles.fieldLabelLeftText}>name:</p>
              </div>
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

            <div className={styles.fieldGroupLeft}>
              <div className={styles.fieldLabelLeftWrapper}>
                <p className={styles.fieldLabelLeftText}>pronouns:</p>
              </div>
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

            <div className={styles.fieldGroupLeft}>
              <div className={styles.fieldLabelLeftWrapper}>
                <p className={styles.fieldLabelLeftText}>major/title:</p>
              </div>
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

            {/* ── PART 2: status + interests + nav ── */}

            <div className={styles.fieldGroupRight}>
              <div className={styles.fieldLabelRightWrapper}>
                <p className={styles.fieldLabelRightText}>status:</p>
              </div>
              <textarea
                id="pf-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={styles.fieldTextarea}
                placeholder="type here"
                disabled={isSubmitting}
                rows={4}
              />
            </div>

            <div className={styles.fieldGroupRight}>
              <div className={styles.fieldLabelRightWrapper}>
                <p className={styles.fieldLabelRightText}>interests:</p>
              </div>
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
                className={styles.navBtnLeft}
                onClick={handleGoBack}
                disabled={isSubmitting}
              >
                <img
                  src={backfingerImg}
                  alt="go back"
                  className={styles.navFingerLeft}
                />
                <span className={styles.navBtnLabel}>go back</span>
              </button>

              <button
                type="submit"
                className={styles.navBtnRight}
                disabled={isSubmitting}
              >
                <img
                  src={thumbsUpImg}
                  alt="create me"
                  className={styles.navFingerRight}
                />
                <span className={styles.navBtnLabel}>
                  {isSubmitting ? '...' : 'create me!'}
                </span>
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
