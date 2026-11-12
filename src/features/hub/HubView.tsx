/**
 * Hub View — "Network" screen
 * Now displays a Pixi.js animation with walking characters
 */

import React, { useCallback, useRef, useState } from 'react';
import { useAuth } from '@/core/auth';
import { useAppState } from '@/core/state-machine';
import { AppState } from '@/core/state-machine/appStateMachine';
import { PixiHub, type CharacterClickData } from './components/PixiHub';
import { ProfileCardView } from '@/features/discovery/components/ProfileCardView';
import { CameraPreview, PinnedRegistrationQR } from '@/features/kiosk';
import { hubService } from './services/hubService';
import { storageService } from '@/core/supabase/storage';
import { HintToast } from '@/shared/components';
import { useHints } from '@/shared/hooks/useHints';
import type { RandomImageData } from '@/features/discovery/types/image';
import { MAIN_ROOM, type RoomId } from './rooms/rooms';

export const HubView: React.FC = () => {
  const { transitionTo } = useAppState();
  const { kioskOrgId } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState<RandomImageData | null>(null);
  // Lives here, not in PixiHub, so returning from a profile lands back in the same room.
  const [roomId, setRoomId] = useState<RoomId>(MAIN_ROOM);

  const { hint, showHint } = useHints();
  // Ignore clicks while a profile is loading.
  const loadingRef = useRef(false);

  const showLoadFailed = useCallback(
    () => showHint({ id: `profile-load-failed-${Date.now()}`, text: "couldn't load that profile, try again!" }),
    [showHint],
  );

  const handleCharacterClick = useCallback(
    async (data: CharacterClickData) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        // Fetch the owner's user profile
        const owner = await hubService.getUserById(data.owner_id, kioskOrgId || '');

        if (!owner) {
          console.error('[HubView] Owner not found:', data.owner_id);
          showLoadFailed();
          return;
        }

        // Fetch gesture_image (full photo) for profile display
        const gestureImagePath = await hubService.getGestureImageByOwnerId(
          data.owner_id,
          kioskOrgId || ''
        );

        // Generate signed URL for the gesture image
        let profileImageUrl = '';
        if (gestureImagePath) {
          profileImageUrl = await storageService.getPhotoUrl(gestureImagePath);
        }

        // Build RandomImageData for ProfileCardView using gesture_image
        const profileData: RandomImageData = {
          image: {
            id: data.cropped_image_id,
            owner_id: data.owner_id,
            org_id: kioskOrgId || '',
            storage_path: gestureImagePath || data.storage_path,
            category: 'profile',
            is_public: true,
            created_at: owner.user.created_at,
          },
          owner: {
            ...owner.user,
            org_id: kioskOrgId || '',
          },
          imageUrl: profileImageUrl,
        };

        setSelectedProfile(profileData);
      } catch (error) {
        console.error('[HubView] Failed to load profile:', error);
        showLoadFailed();
      } finally {
        loadingRef.current = false;
      }
    },
    [kioskOrgId, showLoadFailed]
  );

  const handleBack = () => setSelectedProfile(null);
  const handleHome = () => transitionTo(AppState.IDLE);

  // Show profile detail if one is selected
  if (selectedProfile) {
    return (
      <ProfileCardView
        profileData={selectedProfile}
        onBack={handleBack}
        backLabel="back to network"
        onHome={handleHome}
      />
    );
  }

  return (
    <>
      <PixiHub
        onCharacterClick={handleCharacterClick}
        orgId={kioskOrgId || ''}
        roomId={roomId}
        onRoomChange={setRoomId}
      />
      <PinnedRegistrationQR />
      <CameraPreview />
      <HintToast hint={hint} />
    </>
  );
};