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

export interface DeleteImagesResponse {
  success: boolean;
  gesture_rows_deleted: number;
  cropped_rows_deleted: number;
  storage_objects_deleted: number;
  error?: string;
  error_code?: string;
}

export interface DeleteAccountResponse {
  success: boolean;
  storage_objects_deleted: number;
  auth_user_deleted: boolean;
  error?: string;
  error_code?: string;
}
