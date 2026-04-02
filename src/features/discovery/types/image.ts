/**
 * Discovery Image Types
 * Type definitions for images and user data in the discovery feature
 */

/**
 * Image record from database
 * Represents a row from the 'image' table
 */
export interface ImageRecord {
  /** Unique identifier for the image */
  id: string;
  /** User ID who owns this image (references auth.users) */
  owner_id: string;
  /** Organization ID this image belongs to */
  org_id: string;
  /** Storage path in Supabase storage bucket */
  storage_path: string;
  /** Cropped image storage path (populated after smart crop) */
  cropped_path?: string | null;
  /** Category of the image (e.g., 'profile', 'uncategorized') */
  category: string;
  /** Whether the image is publicly visible */
  is_public: boolean;
  /** Timestamp when the image was created */
  created_at: string;
}

/**
 * User profile data
 * Subset of user table fields needed for display in discovery
 */
export interface UserProfile {
  /** User ID (references auth.users) */
  id: string;
  /** User's name shown to other users */
  name: string;
  /** User's status/description (optional) */
  status: string | null;
  /** User's pronouns (optional) */
  pronouns: string | null;
  /** User's major or title (optional) */
  major: string | null;
  /** User's interests (optional array) */
  interests: string[] | null;
}

/**
 * Random image data with owner info
 * Combined data structure returned from fetchRandomImage service
 */
export interface RandomImageData {
  /** Image record from database */
  image: ImageRecord;
  /** Owner's profile information */
  owner: UserProfile;
  /** Public URL to access the image from storage */
  imageUrl: string;
}
