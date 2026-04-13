/**
 * SignUpStep Component — Figma "create account" screen
 */

import React, { useState } from 'react';
import styles from './RegistrationSteps.module.css';
// TODO: replace with next_button.svg when asset is available
import nextButtonImg from '../../../assets/arrow1.svg';

interface SignUpStepProps {
  onSubmit: (email: string, password: string) => Promise<boolean>;
  isSubmitting: boolean;
  error: string | null;
  onClearError: () => void;
}

export const SignUpStep: React.FC<SignUpStepProps> = ({
  onSubmit,
  isSubmitting,
  error,
  onClearError,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    setLocalError(null);
    onClearError();

    if (!email.trim()) {
      setLocalError('email is required');
      return false;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setLocalError('please enter a valid email address');
      return false;
    }
    if (!password) {
      setLocalError('password is required');
      return false;
    }
    if (password.length < 6) {
      setLocalError('password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setLocalError('passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    await onSubmit(email.trim(), password);
  };

  const displayError = localError || error;

  return (
    <div className={styles.signupWrapper}>
      {/* createTab is a sibling ABOVE the card, not inside it */}
      <div className={styles.createTab}>
        <p className={styles.createTabText}>create account</p>
      </div>

      <div className={styles.signupCard}>
        <p className={styles.signupDescription}>
          Create a Me2You account to connect with people around you!
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {displayError && (
            <div className={styles.errorBanner}>{displayError}</div>
          )}

          <div className={styles.inputBlock}>
            <label
              htmlFor="su-email"
              className={`${styles.inputLabelLime} ${styles.inputBlockLabel}`}
            >
              email:
            </label>
            <input
              id="su-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.inputBlockField}
              placeholder="type here"
              disabled={isSubmitting}
              autoComplete="email"
              autoCapitalize="none"
            />
          </div>

          <div className={styles.inputBlock}>
            <label
              htmlFor="su-password"
              className={`${styles.inputLabelLime} ${styles.inputBlockLabel}`}
            >
              password:
            </label>
            <input
              id="su-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.inputBlockField}
              placeholder="type here"
              disabled={isSubmitting}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.inputBlock}>
            <label
              htmlFor="su-confirm"
              className={`${styles.inputLabelLime} ${styles.inputBlockLabel}`}
            >
              confirm password:
            </label>
            <input
              id="su-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.inputBlockField}
              placeholder="type here"
              disabled={isSubmitting}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.nextBtnWrapper}>
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
  );
};
