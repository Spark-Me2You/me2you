import type { UserProfile } from '@/core/auth/AuthContext';

export type GestureCategory = 'wave' | 'peace_sign' | 'thumbs_up';

export interface UpdateProfileInput {
  name?: string;
  status?: string | null;
  pronouns?: string | null;
  major?: string | null;
  interests?: string[] | null;
}

export interface ProfileWithImage {
  profile: UserProfile;
  imageUrl: string | null;
  imageStoragePath: string | null;
  imageId: string | null;
  bobbleheadUrl: string | null;
  bobbleheadStoragePath: string | null;
  bobbleheadId: string | null;
}
