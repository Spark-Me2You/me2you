/**
 * User Profile View
 * Displays user profile after sign-in
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import { supabase } from '@/core/supabase/client';
import { storageService } from '@/core/supabase/storage';
import logo from '@/assets/me2you.png';
import styles from './UserProfileView.module.css';

export const UserProfileView: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(true);

  useEffect(() => {
    const fetchProfilePhoto = async () => {
      if (!userProfile) return;

      try {
        // Get user's most recent image from image table
        const { data, error } = await supabase
          .from('image')
          .select('storage_path')
          .eq('owner_id', userProfile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error || !data) {
          console.error('[UserProfileView] Error fetching image:', error);
          return;
        }

        // Get signed URL for the photo
        const url = await storageService.getPhotoUrl(data.storage_path);
        setPhotoUrl(url);
      } catch (err) {
        console.error('[UserProfileView] Error loading photo:', err);
      } finally {
        setIsLoadingPhoto(false);
      }
    };

    fetchProfilePhoto();
  }, [userProfile]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/user');
    } catch (error) {
      console.error('[UserProfileView] Sign out failed:', error);
    }
  };

  if (!userProfile) {
    return null;
  }

  return (
    <div className={styles.page}>
      <img src={logo} alt="me2you" className={styles.logo} />

      <div className={styles.content}>
        <div className={styles.profileCard}>
          <div className={styles.photoSection}>
            {isLoadingPhoto ? (
              <div className={styles.photoPlaceholder}>
                <span className={styles.loadingText}>loading...</span>
              </div>
            ) : photoUrl ? (
              <img src={photoUrl} alt={userProfile.name} className={styles.profilePhoto} />
            ) : (
              <div className={styles.photoPlaceholder}>
                <span className={styles.initials}>
                  {userProfile.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className={styles.profileInfo}>
            <h1 className={styles.name}>{userProfile.name}</h1>

            {userProfile.pronouns && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>pronouns:</span>
                <span className={styles.fieldValue}>{userProfile.pronouns}</span>
              </div>
            )}

            {userProfile.major && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>major:</span>
                <span className={styles.fieldValue}>{userProfile.major}</span>
              </div>
            )}

            {userProfile.status && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>status:</span>
                <span className={styles.fieldValue}>{userProfile.status}</span>
              </div>
            )}

            {userProfile.interests && userProfile.interests.length > 0 && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>interests:</span>
                <span className={styles.fieldValue}>{userProfile.interests.join(', ')}</span>
              </div>
            )}
          </div>

          <button onClick={handleSignOut} className={styles.signOutButton}>
            sign out
          </button>
        </div>
      </div>
    </div>
  );
};
