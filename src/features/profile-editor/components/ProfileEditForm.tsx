import React, { useState } from 'react';
import type { ProfileWithImage, UpdateProfileInput } from '../types/profileTypes';

interface ProfileEditFormProps {
  initialData: ProfileWithImage;
  onSave: (data: UpdateProfileInput) => Promise<void>;
  onCancel: () => void;
  onChangePhoto: () => void;
  isSubmitting: boolean;
  error: string | null;
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
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
  const [interests, setInterests] = useState(initialData.profile.interests?.join(', ') || '');
  const [localError, setLocalError] = useState<string | null>(null);

  const validateForm = (): boolean => {
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
    if (!validateForm()) return;

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
    <div style={styles.page}>
      <div style={styles.container}>
        <h2 style={styles.title}>Edit Profile</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {displayError && (
            <div style={styles.errorBanner}>{displayError}</div>
          )}

          {/* Photo Section */}
          <div style={styles.photoSection}>
            <label style={styles.label}>Profile Photo</label>
            <div style={styles.photoContainer}>
              {initialData.imageUrl ? (
                <img src={initialData.imageUrl} alt="Profile" style={styles.photo} />
              ) : (
                <div style={styles.photoPlaceholder}>No Photo</div>
              )}
            </div>
            <button
              type="button"
              onClick={onChangePhoto}
              disabled={isSubmitting}
              style={styles.changePhotoBtn}
            >
              Change Photo
            </button>
          </div>

          {/* Name (Required) */}
          <div style={styles.field}>
            <label htmlFor="name" style={styles.label}>
              Name <span style={styles.required}>*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              disabled={isSubmitting}
              style={styles.input}
              placeholder="Enter your name"
            />
            <span style={styles.charCount}>{name.length}/60</span>
          </div>

          {/* Status */}
          <div style={styles.field}>
            <label htmlFor="status" style={styles.label}>Status</label>
            <textarea
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              maxLength={150}
              disabled={isSubmitting}
              style={styles.textarea}
              placeholder="What's on your mind?"
              rows={3}
            />
            <span style={styles.charCount}>{status.length}/150</span>
          </div>

          {/* Pronouns */}
          <div style={styles.field}>
            <label htmlFor="pronouns" style={styles.label}>Pronouns</label>
            <input
              id="pronouns"
              type="text"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              disabled={isSubmitting}
              style={styles.input}
              placeholder="e.g., she/her, he/him, they/them"
            />
          </div>

          {/* Major */}
          <div style={styles.field}>
            <label htmlFor="major" style={styles.label}>Major</label>
            <input
              id="major"
              type="text"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              disabled={isSubmitting}
              style={styles.input}
              placeholder="e.g., Computer Science"
            />
          </div>

          {/* Interests */}
          <div style={styles.field}>
            <label htmlFor="interests" style={styles.label}>Interests</label>
            <input
              id="interests"
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              disabled={isSubmitting}
              style={styles.input}
              placeholder="Comma-separated (e.g., art, music, coding)"
            />
            <span style={styles.hint}>Separate interests with commas</span>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              style={styles.cancelBtn}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={styles.saveBtn}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    padding: '2rem 1.5rem',
  },
  container: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '3rem 2.5rem',
    width: '100%',
    maxWidth: '800px',
    border: '1px solid #e8e8e8',
  },
  title: {
    margin: '0 0 2rem 0',
    fontSize: '2rem',
    fontWeight: 700,
    color: '#111111',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  errorBanner: {
    padding: '0.75rem 1rem',
    background: '#fee',
    color: '#c33',
    borderRadius: '8px',
    fontSize: '0.95rem',
    textAlign: 'center',
  },
  photoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e8e8e8',
  },
  photoContainer: {
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '2px solid #e8e8e8',
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f5',
    color: '#999',
    fontSize: '0.9rem',
  },
  changePhotoBtn: {
    padding: '0.5rem 1.5rem',
    fontSize: '0.95rem',
    background: '#111111',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#333',
  },
  required: {
    color: '#c33',
  },
  input: {
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #ccc',
    borderRadius: '8px',
    outline: 'none',
  },
  textarea: {
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #ccc',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  charCount: {
    fontSize: '0.85rem',
    color: '#888',
    textAlign: 'right',
  },
  hint: {
    fontSize: '0.85rem',
    color: '#666',
    fontStyle: 'italic',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e8e8e8',
  },
  cancelBtn: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    background: 'transparent',
    color: '#555',
    border: '1px solid #ccc',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    background: '#111111',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
