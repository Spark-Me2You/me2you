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
  const [bobbleheadUrl, setBobbleheadUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfilePhoto = async () => {
      if (!userProfile) return;

      try {
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

        const url = await storageService.getPhotoUrl(data.storage_path);
        setPhotoUrl(url);
      } catch (err) {
        console.error('[UserProfileView] Error loading photo:', err);
      } finally {
        setIsLoadingPhoto(false);
      }
    };

    const fetchBobblehead = async () => {
      if (!userProfile) return;
      try {
        const { data } = await supabase
          .from('cropped_image')
          .select('storage_path')
          .eq('owner_id', userProfile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.storage_path) {
          setBobbleheadUrl(await storageService.getPhotoUrl(data.storage_path));
        }
      } catch (err) {
        console.warn('[UserProfileView] Error loading bobblehead:', err);
      }
    };

    fetchProfilePhoto();
    fetchBobblehead();
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
      {/* Hidden SVG filter for fractal texture */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="fractalTexture" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.25 0.25" numOctaves={3} seed={805} />
            <feDisplacementMap in="SourceGraphic" scale={8} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <img src={logo} alt="me2you" className={styles.logo} />

      <div className={styles.content}>
        <div className={styles.profileCard}>
          <div className={styles.photoSection}>
            {/* Profile photo */}
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

            {/* Bobblehead */}
            {bobbleheadUrl ? (
              <div className={styles.bobbleheadContainer}>
                <img src={bobbleheadUrl} alt="bobblehead" className={styles.bobblehead} />
              </div>
            ) : (
              <div className={styles.bobbleheadPlaceholder}>no bobblehead</div>
            )}
          </div>

          <div className={styles.profileInfo}>
            <h1 className={styles.name}>{userProfile.name}</h1>

            {userProfile.pronouns && (
              <div className={styles.fieldWrapper}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>pronouns:</span>
                  <span className={styles.fieldValue}>{userProfile.pronouns}</span>
                </div>
              </div>
            )}

            {userProfile.major && (
              <div className={styles.fieldWrapper}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>major:</span>
                  <span className={styles.fieldValue}>{userProfile.major}</span>
                </div>
              </div>
            )}

            {userProfile.status && (
              <div className={styles.fieldWrapper}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>status:</span>
                  <span className={styles.fieldValue}>{userProfile.status}</span>
                </div>
              </div>
            )}

            {userProfile.interests && userProfile.interests.length > 0 && (
              <div className={styles.fieldWrapper}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>interests:</span>
                  <span className={styles.fieldValue}>{userProfile.interests.join(', ')}</span>
                </div>
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