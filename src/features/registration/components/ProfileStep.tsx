/**
 * ProfileStep Component
 * Profile information form for registration
 */

import React, { useState, useEffect } from 'react';
import styles from './RegistrationSteps.module.css';
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

const MAX_STATUS_LENGTH = 150;

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
  const [status, setStatus] = useState(formData.status || '');
  const [pronouns, setPronouns] = useState(formData.pronouns || '');
  const [major, setMajor] = useState(formData.major || '');
  const [interests, setInterests] = useState<string[]>(formData.interests || []);
  const [interestInput, setInterestInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Update form data in parent when fields change
  useEffect(() => {
    onUpdateFormData({
      name,
      status: status || undefined,
      pronouns: pronouns || undefined,
      major: major || undefined,
      interests: interests.length > 0 ? interests : undefined,
    });
  }, [name, status, pronouns, major, interests, onUpdateFormData]);

  const handleAddInterest = () => {
    const trimmed = interestInput.trim();
    if (trimmed && !interests.includes(trimmed) && interests.length < 10) {
      setInterests([...interests, trimmed]);
      setInterestInput('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const handleInterestKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddInterest();
    }
  };

  const validateForm = (): boolean => {
    setLocalError(null);
    onClearError();

    if (!name.trim()) {
      setLocalError('Name is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSubmit();
  };

  const displayError = localError || error;
  const statusLength = status.length;
  const statusWarning = statusLength > MAX_STATUS_LENGTH * 0.9;
  const statusError = statusLength > MAX_STATUS_LENGTH;

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Tell Us About Yourself</h2>
        <p className={styles.stepDescription}>
          Fill in your profile information
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {displayError && (
          <div className={styles.errorMessage}>
            {displayError}
          </div>
        )}

        <div className={styles.inputGroup}>
          <label htmlFor="name" className={styles.label}>
            Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
            placeholder="Your display name"
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="pronouns" className={styles.label}>
            Pronouns
          </label>
          <input
            id="pronouns"
            type="text"
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value)}
            className={styles.input}
            placeholder="e.g., she/her, he/him, they/them"
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="major" className={styles.label}>
            Major
          </label>
          <input
            id="major"
            type="text"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            className={styles.input}
            placeholder="Your field of study"
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="status" className={styles.label}>
            Status
          </label>
          <textarea
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value.slice(0, MAX_STATUS_LENGTH))}
            className={styles.textarea}
            placeholder="A short bio or status message"
            disabled={isSubmitting}
            rows={3}
          />
          <span className={`${styles.charCount} ${statusWarning ? styles.warning : ''} ${statusError ? styles.error : ''}`}>
            {statusLength}/{MAX_STATUS_LENGTH}
          </span>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="interests" className={styles.label}>
            Interests
          </label>
          <div className={styles.interestsContainer}>
            {interests.length > 0 && (
              <div className={styles.interestTags}>
                {interests.map((interest) => (
                  <span key={interest} className={styles.interestTag}>
                    {interest}
                    <button
                      type="button"
                      className={styles.removeTag}
                      onClick={() => handleRemoveInterest(interest)}
                      disabled={isSubmitting}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              id="interests"
              type="text"
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              onKeyDown={handleInterestKeyDown}
              onBlur={handleAddInterest}
              className={styles.interestInput}
              placeholder={interests.length >= 10 ? 'Max 10 interests' : 'Type an interest and press Enter'}
              disabled={isSubmitting || interests.length >= 10}
            />
          </div>
        </div>

        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onBack}
            disabled={isSubmitting}
          >
            Back
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
};
