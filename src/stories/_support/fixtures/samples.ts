/**
 * Prop samples
 * Typed values for stories that render a presentational component directly
 * instead of loading data through a service.
 */

import type { HubUserData } from '@/features/hub/services/hubService';
import type { RandomImageData } from '@/features/discovery/types/image';
import type { FlapFlapLeaderboardEntry } from '@/features/games/services/gameScoreService';
import type { AccessorySettings, AvatarLandmarkPoints, ProfileWithImage } from '@/features/profile-editor/types/profileTypes';
import type { ClaimPayload } from '@/features/claim/types';
import { HEAD_LANDMARKS, placeholderImageUrl } from './images';
import { ME_ID, ORG_ID, seedTables } from './data';

const userRow = (id: string) => seedTables().user.find((u) => u.id === id)!;

export const sampleUser = (id = 'user-ava') => {
  const row = userRow(id);
  return {
    id: row.id as string,
    org_id: ORG_ID,
    name: row.name as string,
    status: row.status as string | null,
    pronouns: row.pronouns as string | null,
    major: row.major as string | null,
    interests: row.interests as string[] | null,
    created_at: row.created_at as string,
    accessory: row.accessory as 'sunglasses' | 'hat' | 'balloon' | null,
  };
};

export const sampleHubUser = (id = 'user-ava'): HubUserData => {
  const user: Partial<ReturnType<typeof sampleUser>> = sampleUser(id);
  delete user.org_id;
  return { user: user as HubUserData['user'], profileImageUrl: placeholderImageUrl(`${id}/profile.jpg`) };
};

export const sampleRandomImage = (id = 'user-ava', category = 'wave'): RandomImageData => ({
  image: {
    id: `gesture-${id}-${category}`,
    owner_id: id,
    org_id: ORG_ID,
    storage_path: `${id}/${category}.jpg`,
    category,
    is_public: true,
    created_at: '2026-10-01T12:00:00.000Z',
  },
  owner: sampleUser(id),
  imageUrl: placeholderImageUrl(`${id}/${category}.jpg`),
});

export const sampleLeaderboard: FlapFlapLeaderboardEntry[] = [
  { rank: 1, ownerId: 'user-eli', playerName: 'Eli Novak', score: 42, createdAt: '2026-10-14T15:00:00.000Z' },
  { rank: 2, ownerId: 'user-ava', playerName: 'Ava Chen', score: 37, createdAt: '2026-10-13T15:00:00.000Z' },
  { rank: 3, ownerId: ME_ID, playerName: 'Sam Rivera', score: 31, createdAt: '2026-10-12T15:00:00.000Z' },
  { rank: 4, ownerId: 'user-ben', playerName: 'Ben Okafor', score: 28, createdAt: '2026-10-11T15:00:00.000Z' },
  { rank: 5, ownerId: 'user-jo', playerName: 'Jo Adeyemi', score: 19, createdAt: '2026-10-10T15:00:00.000Z' },
];

export const sampleLandmarks: AvatarLandmarkPoints = {
  centroid_point: HEAD_LANDMARKS.faceCenter,
  left_eye_point: HEAD_LANDMARKS.leftEye,
  right_eye_point: HEAD_LANDMARKS.rightEye,
  forehead_top_point: HEAD_LANDMARKS.foreheadTop,
};

export const sampleAccessory: AccessorySettings = {
  selected_accessory: 'sunglasses',
  relative_x: 0,
  relative_y: 0,
  scale: 1,
};

export const sampleProfileWithImage = (): ProfileWithImage => ({
  profile: { ...sampleUser(ME_ID), onboarding_complete: true } as unknown as ProfileWithImage['profile'],
  imageUrl: placeholderImageUrl(`${ME_ID}/profile.jpg`),
  imageStoragePath: `${ME_ID}/profile.jpg`,
  imageId: `gesture-${ME_ID}-profile`,
  bobbleheadUrl: placeholderImageUrl(`${ME_ID}/profile_cropped.png`),
  bobbleheadStoragePath: `${ME_ID}/profile_cropped.png`,
  bobbleheadId: `cropped-${ME_ID}`,
  bobbleheadLandmarks: sampleLandmarks,
});

export const sampleClaimPayload = (type: 'score' | 'drawing' | 'message' = 'score'): ClaimPayload => {
  switch (type) {
    case 'drawing':
      return {
        version: '1.0',
        type: 'drawing',
        display: { title: 'Your drawing', description: 'Save your "cat" drawing to your gallery', icon: '🎨' },
        data: { image_path: 'temp/drawing-claim.png', prompt: 'cat' },
      };
    case 'message':
      return {
        version: '1.0',
        type: 'message',
        display: { title: 'Message Ava', description: 'Send Ava Chen a message', icon: '💌' },
        data: { recipient_id: 'user-ava', recipient_name: 'Ava Chen' },
      };
    default:
      return {
        version: '1.0',
        type: 'game_score',
        display: { title: 'FlapFlap score', description: 'Claim your score of 27', icon: '🐦' },
        data: { game_id: 'flapflap', score: 27 },
      };
  }
};

/** A pending claim token row for /claim/:tokenId stories. */
export const claimTokenRow = (id: string, type: 'score' | 'drawing' | 'message') => ({
  id,
  org_id: ORG_ID,
  payload: sampleClaimPayload(type),
  status: 'pending',
  claimed_by: null,
  expires_at: '2099-01-01T00:00:00.000Z',
  created_at: '2026-10-15T12:00:00.000Z',
});
