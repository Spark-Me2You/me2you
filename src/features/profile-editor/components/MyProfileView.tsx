import React, { useState } from 'react';
import { useAuth } from '@/core/auth';
import { useProfileData } from '../hooks/useProfileData';
import { profileService } from '../services/profileService';
import { ProfileDisplay } from './ProfileDisplay';
import { ProfileEditForm } from './ProfileEditForm';
import { PhotoCaptureModal } from './PhotoCaptureModal';
import type { UpdateProfileInput, GestureCategory } from '../types/profileTypes';

interface MyProfileViewProps {
  onBack: () => void;
}

export const MyProfileView: React.FC<MyProfileViewProps> = ({ onBack }) => {
  const { user, setUserProfile } = useAuth();
  const { profileData, isLoading, error, refetch } = useProfileData();
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveProfile = async (data: UpdateProfileInput) => {
    if (!user || !profileData) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await profileService.updateProfile(user.id, data);
      setUserProfile(updated);
      await refetch();
      setMode('view');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update profile';
      setSaveError(message);
      console.error('[MyProfileView] Failed to save profile:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoCapture = async (photo: Blob, category: GestureCategory) => {
    if (!user || !profileData) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      await profileService.updatePhoto(
        photo,
        user.id,
        profileData.profile.org_id!,
        category,
        profileData.imageId,
        profileData.imageStoragePath
      );
      await refetch();
      setIsPhotoModalOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update photo';
      setSaveError(message);
      console.error('[MyProfileView] Failed to update photo:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={styles.message}>Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error or no profile state
  if (error || !profileData) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.textGroup}>
            <h2 style={styles.title}>My Profile</h2>
            <p style={styles.subtitle}>
              {error || 'Profile not found. Please complete registration.'}
            </p>
          </div>
          <div style={styles.actions}>
            <button onClick={onBack} style={styles.backBtn}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Edit mode
  if (mode === 'edit') {
    return (
      <>
        <ProfileEditForm
          initialData={profileData}
          onSave={handleSaveProfile}
          onCancel={() => {
            setMode('view');
            setSaveError(null);
          }}
          onChangePhoto={() => setIsPhotoModalOpen(true)}
          isSubmitting={isSaving}
          error={saveError}
        />
        <PhotoCaptureModal
          isOpen={isPhotoModalOpen}
          onClose={() => {
            setIsPhotoModalOpen(false);
            setSaveError(null);
          }}
          onCapture={handlePhotoCapture}
          isSubmitting={isSaving}
        />
      </>
    );
  }

  // View mode
  return (
    <ProfileDisplay
      profile={profileData.profile}
      imageUrl={profileData.imageUrl}
      onEdit={() => setMode('edit')}
      onBack={onBack}
    />
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
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '3rem 2.5rem',
    width: '100%',
    maxWidth: '1600px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '2rem',
    border: '1px solid #e8e8e8',
  },
  textGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  title: {
    margin: 0,
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#111111',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#888',
  },
  message: {
    margin: 0,
    fontSize: '1rem',
    color: '#555',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    flexShrink: 0,
  },
  backBtn: {
    padding: '0.65rem 1.25rem',
    fontSize: '0.95rem',
    background: 'transparent',
    color: '#555',
    border: '1px solid #ccc',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
