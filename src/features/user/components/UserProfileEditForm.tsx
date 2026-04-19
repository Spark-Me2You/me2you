import React, { useState } from 'react';
import logo from '@/assets/me2you.png';
import type {
  ProfileWithImage,
  UpdateProfileInput,
} from '@/features/profile-editor/types/profileTypes';
import styles from './UserProfileEditForm.module.css';

interface UserProfileEditFormProps {
  initialData: ProfileWithImage;
  onSave: (data: UpdateProfileInput) => Promise<void>;
  onCancel: () => void;
  onChangePhoto: () => void;
  isSubmitting: boolean;
  error: string | null;
}

export const UserProfileEditForm: React.FC<UserProfileEditFormProps> = ({
  initialData,
  onSave,
  onCancel,
  onChangePhoto,
  isSubmitting,
  error,
}) => {
  const [name, setName] = useState(initialData.profile.name || '');
  const [status, setStatus] = useState(initialData.profile.status || '');
  const [pronouns, setPronouns] = useState(initialData.profile.pronouns || '');
  const [major, setMajor] = useState(initialData.profile.major || '');
  const [interests, setInterests] = useState(
    initialData.profile.interests?.join(', ') || ''
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const validate = (): boolean => {
    setLocalError(null);
    if (!name.trim()) {
      setLocalError('name is required');
      return false;
    }
    if (name.length > 60) {
      setLocalError('name must be 60 characters or less');
      return false;
    }
    if (status.length > 150) {
      setLocalError('status must be 150 characters or less');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const updates: UpdateProfileInput = {
      name,
      status: status || null,
      pronouns: pronouns || null,
      major: major || null,
      interests: interests
        ? interests
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : null,
    };

    await onSave(updates);
  };

  const displayError = localError || error;

  return (
    <div className={styles.page}>
      <img src={logo} alt="me2you" className={styles.logo} />

      <div className={styles.content}>
        <div className={styles.card}>
          <h2 className={styles.title}>edit profile</h2>

          <div className={styles.photoSection}>
            {initialData.imageUrl ? (
              <img
                src={initialData.imageUrl}
                alt="profile"
                className={styles.profilePhoto}
              />
            ) : (
              <div className={styles.photoPlaceholder}>no photo</div>
            )}

            {initialData.bobbleheadUrl ? (
              <div className={styles.bobbleheadContainer}>
                <img
                  src={initialData.bobbleheadUrl}
                  alt="bobblehead"
                  className={styles.bobblehead}
                />
              </div>
            ) : (
              <div className={styles.bobbleheadPlaceholder}>no bobblehead</div>
            )}
          </div>

          <button
            type="button"
            onClick={onChangePhoto}
            disabled={isSubmitting}
            className={styles.changePhotoBtn}
          >
            change photo
          </button>
          <p className={styles.photoHint}>
            changing your photo also regenerates your bobblehead
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {displayError && (
              <div className={styles.errorBanner}>{displayError}</div>
            )}

            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>
                name <span className={styles.required}>*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                disabled={isSubmitting}
                className={styles.input}
                placeholder="your name"
              />
              <span className={styles.charCount}>{name.length}/60</span>
            </div>

            <div className={styles.field}>
              <label htmlFor="status" className={styles.label}>
                status
              </label>
              <textarea
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                maxLength={150}
                disabled={isSubmitting}
                className={styles.textarea}
                placeholder="what's on your mind?"
                rows={3}
              />
              <span className={styles.charCount}>{status.length}/150</span>
            </div>

            <div className={styles.field}>
              <label htmlFor="pronouns" className={styles.label}>
                pronouns
              </label>
              <input
                id="pronouns"
                type="text"
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                disabled={isSubmitting}
                className={styles.input}
                placeholder="she/her, he/him, they/them"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="major" className={styles.label}>
                major
              </label>
              <input
                id="major"
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                disabled={isSubmitting}
                className={styles.input}
                placeholder="computer science"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="interests" className={styles.label}>
                interests
              </label>
              <input
                id="interests"
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                disabled={isSubmitting}
                className={styles.input}
                placeholder="art, music, coding"
              />
              <span className={styles.hint}>separate with commas</span>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className={styles.cancelBtn}
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={styles.saveBtn}
              >
                {isSubmitting ? 'saving...' : 'save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
