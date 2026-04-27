import type { UserProfile, Accessory } from '@/core/auth/AuthContext';

export type GestureCategory = 'wave' | 'peace_sign' | 'thumbs_up';

export interface UpdateProfileInput {
  name?: string;
  status?: string | null;
  pronouns?: string | null;
  major?: string | null;
  interests?: string[] | null;
  accessory?: Accessory | null;
}

export interface AccessorySettings {
  selected_accessory: Accessory | null;
  /** Percentage-point delta of the 220×220 preview container. Positive = right. */
  relative_x: number;
  /** Percentage-point delta of the 220×220 preview container. Positive = down. */
  relative_y: number;
  /** Width scale multiplier applied on top of baseline tuning. */
  scale: number;
}

export interface AvatarLandmarkPoints {
  centroid_point: { x: number; y: number } | null;
  left_eye_point: { x: number; y: number } | null;
  right_eye_point: { x: number; y: number } | null;
  forehead_top_point: { x: number; y: number } | null;
}

export const DEFAULT_ACCESSORY_SETTINGS: AccessorySettings = {
  selected_accessory: null,
  relative_x: 0,
  relative_y: 0,
  scale: 1,
};

export interface ProfileWithImage {
  profile: UserProfile;
  imageUrl: string | null;
  imageStoragePath: string | null;
  imageId: string | null;
  bobbleheadUrl: string | null;
  bobbleheadStoragePath: string | null;
  bobbleheadId: string | null;
  bobbleheadLandmarks: AvatarLandmarkPoints | null;
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
