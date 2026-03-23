/**
 * SignUpStep Component
 * Email/password signup form for registration
 */

import React, { useState } from 'react';
import styles from './RegistrationSteps.module.css';

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
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    setLocalError(null);
    onClearError();

    if (!email.trim()) {
      setLocalError('Email is required');
      return false;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setLocalError('Please enter a valid email address');
      return false;
    }

    if (!password) {
      setLocalError('Password is required');
      return false;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return false;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSubmit(email.trim(), password);
  };

  const displayError = localError || error;

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Create Your Account</h2>
        <p className={styles.stepDescription}>
          Sign up to create your me2you profile
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {displayError && (
          <div className={styles.errorMessage}>
            {displayError}
          </div>
        )}

        <div className={styles.inputGroup}>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            placeholder="your.email@example.com"
            disabled={isSubmitting}
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <div className={styles.passwordWrapper}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="At least 6 characters"
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="confirmPassword" className={styles.label}>
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={styles.input}
            placeholder="Re-enter your password"
            disabled={isSubmitting}
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account...' : 'Continue'}
        </button>
      </form>
    </div>
  );
};
