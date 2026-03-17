/**
 * useImageChambers Hook
 * Manages image batching/pre-loading system for gesture-based discovery
 *
 * This hook:
 * 1. Pre-fetches batches of images for each category on mount
 * 2. Maintains "chambers" (queues) of images per category
 * 3. Provides instant image access via popImage()
 * 4. Automatically refills chambers in background when running low
 * 5. Implements safeguards to prevent infinite refills for small categories
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { discoveryService } from '../services/discoveryService';
import {
  DEFAULT_BATCH_SIZE,
  REFILL_THRESHOLD,
  MIN_REFILL_INTERVAL_MS,
} from '../config/chamberConfig';
import type {
  ImageChamber,
  ChambersState,
  UseImageChambersReturn,
} from '../types/chamber';
import type { RandomImageData } from '../types/image';

/**
 * Custom hook for managing image chambers
 *
 * @param orgId - Organization ID from kiosk session
 * @param categories - Array of category names to initialize chambers for
 * @returns Object with chamber access methods and state
 */
export const useImageChambers = (
  orgId: string | null,
  categories: string[]
): UseImageChambersReturn => {
  // Main state: chambers map and initialization flag
  const [chambersState, setChambersState] = useState<ChambersState>({
    chambers: {},
    isInitialized: false,
  });

  // Ref to track ongoing refills (prevents race conditions)
  const refillingRef = useRef<Set<string>>(new Set());

  /**
   * Initialize all chambers on mount
   * For each category:
   * 1. Get total count
   * 2. Fetch initial batch (respecting count limits)
   * 3. Set up chamber with totalCount for refill safeguards
   */
  useEffect(() => {
    if (!orgId || categories.length === 0) {
      console.log('[useImageChambers] Skipping initialization: no orgId or categories');
      return;
    }

    const initializeChambers = async () => {
      console.log('[useImageChambers] Initializing chambers for:', categories);

      const initialChambers: Record<string, ImageChamber> = {};

      // Initialize all categories in parallel
      await Promise.all(
        categories.map(async (category) => {
          try {
            // Step 1: Get total count for safeguards
            const totalCount = await discoveryService.getImageCount(
              orgId,
              category
            );

            console.log(
              `[useImageChambers] Category ${category} has ${totalCount} images`
            );

            // Step 2: Handle edge cases based on count
            if (totalCount === 0) {
              // No images - set error state, no chamber
              initialChambers[category] = {
                category,
                images: [],
                totalCount: 0,
                isRefilling: false,
                lastRefillTime: 0,
                error: `No images available for ${category} category`,
              };
              console.warn(
                `[useImageChambers] No images for category: ${category}`
              );
              return;
            }

            // Step 3: Fetch initial batch
            // Fetch min(totalCount, DEFAULT_BATCH_SIZE) to avoid over-fetching
            const fetchLimit = Math.min(totalCount, DEFAULT_BATCH_SIZE);
            const images = await discoveryService.fetchRandomImageBatch(
              orgId,
              category,
              fetchLimit
            );

            // Step 4: Create chamber
            initialChambers[category] = {
              category,
              images,
              totalCount,
              isRefilling: false,
              lastRefillTime: Date.now(),
              error: null,
            };

            console.log(
              `[useImageChambers] Chamber initialized for ${category}:`,
              images.length,
              'images loaded,',
              totalCount,
              'total available'
            );
          } catch (error) {
            // Error during initialization - create error chamber
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Failed to load images';

            initialChambers[category] = {
              category,
              images: [],
              totalCount: null,
              isRefilling: false,
              lastRefillTime: 0,
              error: errorMessage,
            };

            console.error(
              `[useImageChambers] Failed to initialize ${category}:`,
              error
            );
          }
        })
      );

      // Update state with all initialized chambers
      setChambersState({
        chambers: initialChambers,
        isInitialized: true,
      });

      console.log('[useImageChambers] All chambers initialized');
    };

    initializeChambers();
  }, [orgId, categories]);

  /**
   * Trigger a refill for a category's chamber
   * Internal function with all safeguards
   */
  const triggerRefill = useCallback(
    async (category: string) => {
      const chamber = chambersState.chambers[category];

      if (!chamber || !orgId) {
        return;
      }

      // SAFEGUARD 1: Don't refill if totalCount is 0 or 1
      if (chamber.totalCount !== null && chamber.totalCount <= 1) {
        console.log(
          `[useImageChambers] Refill blocked for ${category}: totalCount=${chamber.totalCount}`
        );
        return;
      }

      // SAFEGUARD 2: Prevent concurrent refills using ref
      if (refillingRef.current.has(category)) {
        console.log(
          `[useImageChambers] Refill blocked for ${category}: already refilling`
        );
        return;
      }

      // SAFEGUARD 3: Rate limiting
      const now = Date.now();
      const timeSinceLastRefill = now - chamber.lastRefillTime;
      if (timeSinceLastRefill < MIN_REFILL_INTERVAL_MS) {
        console.log(
          `[useImageChambers] Refill blocked for ${category}: rate limit (${timeSinceLastRefill}ms < ${MIN_REFILL_INTERVAL_MS}ms)`
        );
        return;
      }

      // Mark as refilling
      refillingRef.current.add(category);
      setChambersState((prev) => ({
        ...prev,
        chambers: {
          ...prev.chambers,
          [category]: {
            ...prev.chambers[category],
            isRefilling: true,
          },
        },
      }));

      try {
        console.log(
          `[useImageChambers] Refilling chamber for ${category}: current=${chamber.images.length}, threshold=${REFILL_THRESHOLD}`
        );

        // Fetch new batch
        const newImages = await discoveryService.fetchRandomImageBatch(
          orgId,
          category,
          DEFAULT_BATCH_SIZE
        );

        console.log(
          `[useImageChambers] Refill complete for ${category}: fetched ${newImages.length} new images`
        );

        // Update chamber with new images
        setChambersState((prev) => {
          const currentChamber = prev.chambers[category];
          const currentCount = currentChamber.images.length;

          // If we got fewer images than requested, we now know total count
          let updatedTotalCount = currentChamber.totalCount;
          if (
            newImages.length < DEFAULT_BATCH_SIZE &&
            currentChamber.totalCount === null
          ) {
            updatedTotalCount = currentCount + newImages.length;
            console.log(
              `[useImageChambers] Detected total count for ${category}: ${updatedTotalCount}`
            );
          }

          return {
            ...prev,
            chambers: {
              ...prev.chambers,
              [category]: {
                ...currentChamber,
                images: [...currentChamber.images, ...newImages],
                totalCount: updatedTotalCount,
                isRefilling: false,
                lastRefillTime: Date.now(),
              },
            },
          };
        });
      } catch (error) {
        console.error(
          `[useImageChambers] Refill failed for ${category}:`,
          error
        );

        // Set error state but don't crash
        setChambersState((prev) => ({
          ...prev,
          chambers: {
            ...prev.chambers,
            [category]: {
              ...prev.chambers[category],
              isRefilling: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to refill chamber',
            },
          },
        }));
      } finally {
        // Always remove from refilling set
        refillingRef.current.delete(category);
      }
    },
    [chambersState.chambers, orgId]
  );

  /**
   * Pop the next image from a category's chamber
   * Returns image instantly (no async!) and triggers refill if needed
   */
  const popImage = useCallback(
    (category: string): RandomImageData | null => {
      const chamber = chambersState.chambers[category];

      if (!chamber) {
        console.warn(
          `[useImageChambers] popImage: chamber not found for ${category}`
        );
        return null;
      }

      if (chamber.images.length === 0) {
        console.warn(
          `[useImageChambers] popImage: chamber empty for ${category}`
        );
        return null;
      }

      // Remove first image from array
      const image = chamber.images[0];

      setChambersState((prev) => ({
        ...prev,
        chambers: {
          ...prev.chambers,
          [category]: {
            ...prev.chambers[category],
            images: prev.chambers[category].images.slice(1),
          },
        },
      }));

      console.log(
        `[useImageChambers] Popped image from ${category}: ${image.image.id}, ${chamber.images.length - 1} remaining`
      );

      // Check if refill needed
      const remainingAfterPop = chamber.images.length - 1;
      if (remainingAfterPop <= REFILL_THRESHOLD) {
        console.log(
          `[useImageChambers] Triggering refill for ${category}: ${remainingAfterPop} <= ${REFILL_THRESHOLD}`
        );
        // Trigger refill asynchronously (non-blocking)
        triggerRefill(category);
      }

      return image;
    },
    [chambersState.chambers, triggerRefill]
  );

  /**
   * Check if a category has images available
   */
  const hasImages = useCallback(
    (category: string): boolean => {
      const chamber = chambersState.chambers[category];
      return chamber ? chamber.images.length > 0 : false;
    },
    [chambersState.chambers]
  );

  /**
   * Check if a category is currently loading
   */
  const isLoading = useCallback(
    (category: string): boolean => {
      const chamber = chambersState.chambers[category];
      if (!chamber) return !chambersState.isInitialized;
      return chamber.isRefilling;
    },
    [chambersState.chambers, chambersState.isInitialized]
  );

  /**
   * Get error message for a category
   */
  const getError = useCallback(
    (category: string): string | null => {
      const chamber = chambersState.chambers[category];
      return chamber?.error ?? null;
    },
    [chambersState.chambers]
  );

  /**
   * Manually trigger refill (for testing/recovery)
   */
  const refillChamber = useCallback(
    async (category: string): Promise<void> => {
      await triggerRefill(category);
    },
    [triggerRefill]
  );

  return {
    popImage,
    hasImages,
    isLoading,
    getError,
    refillChamber,
    isInitialized: chambersState.isInitialized,
  };
};
