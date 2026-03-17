/**
 * Type definitions for the image chamber system
 */

import type { RandomImageData } from "./image";

/**
 * Image chamber for a single category
 * Maintains a queue of pre-fetched images with metadata for refill logic
 */
export interface ImageChamber {
  /** Category name (e.g., "peace_sign", "wave", "thumbs_up") */
  category: string;

  /** Queue of pre-fetched images ready to display */
  images: RandomImageData[];

  /**
   * Total count of images available in this category
   * - null = unknown (not yet determined)
   * - 0 = no images (error state)
   * - 1 = single image (never refill)
   * - 2+ = normal operation (refill when low)
   */
  totalCount: number | null;

  /** Flag to prevent concurrent refill operations */
  isRefilling: boolean;

  /** Timestamp of last refill attempt (for rate limiting) */
  lastRefillTime: number;

  /** Error message if chamber initialization or refill failed */
  error: string | null;
}

/**
 * Global state for all chambers
 */
export interface ChambersState {
  /** Map of category name to chamber */
  chambers: Record<string, ImageChamber>;

  /** Whether initial chamber loading is complete */
  isInitialized: boolean;
}

/**
 * Return type for useImageChambers hook
 */
export interface UseImageChambersReturn {
  /**
   * Pop the next image from a category's chamber
   * @param category - Category name (e.g., "peace_sign")
   * @returns Image data or null if chamber is empty
   */
  popImage: (category: string) => RandomImageData | null;

  /**
   * Check if a category has images available
   * @param category - Category name
   * @returns true if chamber has at least one image
   */
  hasImages: (category: string) => boolean;

  /**
   * Check if a category's chamber is currently loading
   * @param category - Category name
   * @returns true if initializing or refilling
   */
  isLoading: (category: string) => boolean;

  /**
   * Get error message for a category
   * @param category - Category name
   * @returns Error message or null if no error
   */
  getError: (category: string) => string | null;

  /**
   * Manually trigger a refill for a category (for testing/recovery)
   * @param category - Category name
   */
  refillChamber: (category: string) => Promise<void>;

  /** Whether all chambers have completed initialization */
  isInitialized: boolean;
}
