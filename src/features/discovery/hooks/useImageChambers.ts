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

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
 * Preload images into browser cache
 * Creates Image objects to trigger browser fetch without rendering
 *
 * @param images - Array of image data with URLs to preload
 * @returns Promise that resolves when all images are loaded (or failed)
 */
const preloadImages = (images: RandomImageData[]): Promise<void[]> => {
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          const preloadImg = new Image();
          preloadImg.onload = () => {
            console.log('[preloadImages] Loaded:', img.image.id);
            resolve();
          };
          preloadImg.onerror = () => {
            console.warn('[preloadImages] Failed to load:', img.image.id);
            resolve(); // Resolve anyway to not block other images
          };
          preloadImg.src = img.imageUrl;
        })
    )
  );
};

/**
 * Custom hook for managing image chambers
 *
 * @param orgId - Organization ID from kiosk session
 * @param categories - Array of category names to initialize chambers for
 * @returns Object with chamber access methods and state
 */
export const useImageChambers = (
  orgId: string | null,
  categories: readonly string[]
): UseImageChambersReturn => {
  // Main state: chambers map and initialization flag
  const [chambersState, setChambersState] = useState<ChambersState>({
    chambers: {},
    isInitialized: false,
  });

  // Ref to hold latest chambers state (allows stable callbacks to access fresh state)
  const chambersStateRef = useRef<ChambersState>(chambersState);
  chambersStateRef.current = chambersState;

  // Ref to track ongoing refills (prevents race conditions)
  const refillingRef = useRef<Set<string>>(new Set());

  // Ref to track if we're currently initializing (prevents refills during init)
  const isInitializingRef = useRef<boolean>(false);

  // Ref to prevent duplicate initialization (e.g., React Strict Mode, dependency changes)
  const hasInitializedRef = useRef<boolean>(false);

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

    // CRITICAL: Prevent duplicate initialization
    // This guards against React Strict Mode, dependency changes, or component remounts
    if (hasInitializedRef.current) {
      console.log('[useImageChambers] Already initialized, skipping duplicate fetch');
      return;
    }
    hasInitializedRef.current = true;

    const initializeChambers = async () => {
      // CRITICAL: Mark as initializing to prevent refills during init
      isInitializingRef.current = true;
      console.log('[useImageChambers] Initializing chambers for:', categories);

      const initialChambers: Record<string, ImageChamber> = {};

      // Initialize all categories in parallel
      await Promise.all(
        categories.map(async (category) => {
          try {
            // OPTIMIZATION: Fetch batch first, then determine count
            // This reduces initial database calls from 2 to 1 per category
            const images = await discoveryService.fetchRandomImageBatch(
              orgId,
              category,
              DEFAULT_BATCH_SIZE
            );

            console.log(
              `[useImageChambers] Fetched initial batch for ${category}: ${images.length} images`
            );

            // CRITICAL: Preload images into browser cache
            // This ensures instant display when user makes a gesture
            if (images.length > 0) {
              preloadImages(images).then(() => {
                console.log(
                  `[useImageChambers] Preloaded ${images.length} images for ${category}`
                );
              });
            }

            // Determine total count based on batch size
            let totalCount: number;

            if (images.length === 0) {
              // No images - set error state
              totalCount = 0;
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
            } else if (images.length < DEFAULT_BATCH_SIZE) {
              // Got fewer than requested - we know exact total count
              totalCount = images.length;
              console.log(
                `[useImageChambers] Small category ${category}: exactly ${totalCount} images`
              );
            } else {
              // Got full batch - need to query for exact count
              totalCount = await discoveryService.getImageCount(
                orgId,
                category
              );
              console.log(
                `[useImageChambers] Large category ${category}: ${totalCount} total images`
              );
            }

            // Create chamber
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

      // CRITICAL: Mark initialization as complete
      // This allows refills to proceed normally
      isInitializingRef.current = false;

      console.log('[useImageChambers] All chambers initialized');
    };

    initializeChambers();
  }, [orgId, categories]);

  /**
   * Trigger a refill for a category's chamber
   * Internal function with all safeguards
   *
   * @param category - Category to refill
   * @param currentCount - Current image count in chamber (to avoid stale state)
   * @param totalCount - Known total count (to check safeguards)
   * @param lastRefillTime - Last refill timestamp (for rate limiting)
   */
  const triggerRefill = useCallback(
    async (
      category: string,
      currentCount: number,
      totalCount: number | null,
      lastRefillTime: number
    ) => {
      if (!orgId) {
        return;
      }

      // SAFEGUARD 0: Don't refill during initialization
      if (isInitializingRef.current) {
        console.log(
          `[useImageChambers] Refill blocked for ${category}: still initializing`
        );
        return;
      }

      // SAFEGUARD 1: Don't refill if totalCount is 0 or 1
      if (totalCount !== null && totalCount <= 1) {
        console.log(
          `[useImageChambers] Refill blocked for ${category}: totalCount=${totalCount}`
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
      const timeSinceLastRefill = now - lastRefillTime;
      if (timeSinceLastRefill < MIN_REFILL_INTERVAL_MS) {
        console.log(
          `[useImageChambers] Refill blocked for ${category}: rate limit (${timeSinceLastRefill}ms < ${MIN_REFILL_INTERVAL_MS}ms)`
        );
        return;
      }

      // Mark as refilling (using ref only - no state update to avoid re-renders)
      // The refill should be completely invisible to the user
      refillingRef.current.add(category);

      try {
        console.log(
          `[useImageChambers] Refilling chamber for ${category}: current=${currentCount}, threshold=${REFILL_THRESHOLD}`
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

        // CRITICAL: Preload new images into browser cache
        if (newImages.length > 0) {
          preloadImages(newImages).then(() => {
            console.log(
              `[useImageChambers] Preloaded ${newImages.length} refill images for ${category}`
            );
          });
        }

        // Update chamber with new images using functional state update
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
                // Note: isRefilling tracked via ref, not state, to avoid re-renders
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
        // Note: We still update state for errors since user needs to know
        setChambersState((prev) => ({
          ...prev,
          chambers: {
            ...prev.chambers,
            [category]: {
              ...prev.chambers[category],
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
    [orgId]
  );

  /**
   * Pop the next image from a category's chamber
   * Returns image instantly (no async!) and triggers refill if needed
   *
   * CRITICAL: For categories with totalCount === 1, returns the image
   * WITHOUT removing it from the chamber (keeps same image forever)
   *
   * NOTE: Uses chambersStateRef for stable callback reference (prevents re-renders)
   */
  const popImage = useCallback(
    (category: string): RandomImageData | null => {
      // Use ref to get latest state (allows stable callback reference)
      const chamber = chambersStateRef.current.chambers[category];

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

      // Get first image from queue (FIFO)
      const image = chamber.images[0];

      // CRITICAL FIX: For 1-image categories, DON'T pop from chamber
      // Just return the same image every time
      if (chamber.totalCount === 1) {
        console.log(
          `[useImageChambers] Returning (not popping) single image from ${category}: ${image.image.id}`
        );
        return image;
      }

      // Calculate remaining count BEFORE state update
      const remainingAfterPop = chamber.images.length - 1;

      // Normal case: Remove first image from array (queue behavior)
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
        `[useImageChambers] Popped image from ${category}: ${image.image.id}, ${remainingAfterPop} remaining`
      );

      // PRE-EMPTIVE REFILL: Check threshold with NEW count
      // Pass state values directly to avoid stale closures
      if (remainingAfterPop <= REFILL_THRESHOLD) {
        console.log(
          `[useImageChambers] Triggering refill for ${category}: ${remainingAfterPop} <= ${REFILL_THRESHOLD}`
        );
        // Trigger refill asynchronously (non-blocking)
        // Pass current state to avoid stale closures
        triggerRefill(
          category,
          remainingAfterPop,
          chamber.totalCount,
          chamber.lastRefillTime
        );
      }

      return image;
    },
    [triggerRefill] // Stable: only depends on triggerRefill, uses ref for state
  );

  /**
   * Check if a category has images available
   * NOTE: Uses chambersStateRef for stable callback reference
   */
  const hasImages = useCallback((category: string): boolean => {
    const chamber = chambersStateRef.current.chambers[category];
    return chamber ? chamber.images.length > 0 : false;
  }, []); // Stable: uses ref for state

  /**
   * Check if a category is currently loading
   *
   * IMPORTANT: Only returns true for INITIAL loading, not background refills.
   * Background refills should be invisible to the user - the UI should only
   * show loading state when there are NO images available to display.
   *
   * NOTE: Uses chambersStateRef for stable callback reference
   */
  const isLoading = useCallback((category: string): boolean => {
    const { chambers, isInitialized } = chambersStateRef.current;
    const chamber = chambers[category];
    // Not initialized yet - show loading
    if (!chamber) return !isInitialized;
    // Only show loading if chamber is EMPTY and actively refilling
    // Background refills with images available should NOT show loading
    if (chamber.images.length === 0 && refillingRef.current.has(category)) {
      return true;
    }
    // Has images available - never show loading
    return false;
  }, []); // Stable: uses ref for state

  /**
   * Get error message for a category
   * NOTE: Uses chambersStateRef for stable callback reference
   */
  const getError = useCallback((category: string): string | null => {
    const chamber = chambersStateRef.current.chambers[category];
    return chamber?.error ?? null;
  }, []); // Stable: uses ref for state

  /**
   * Manually trigger refill (for testing/recovery)
   * NOTE: Uses chambersStateRef for stable callback reference
   */
  const refillChamber = useCallback(
    async (category: string): Promise<void> => {
      const chamber = chambersStateRef.current.chambers[category];
      if (!chamber) {
        console.warn(
          `[useImageChambers] refillChamber: chamber not found for ${category}`
        );
        return;
      }

      await triggerRefill(
        category,
        chamber.images.length,
        chamber.totalCount,
        chamber.lastRefillTime
      );
    },
    [triggerRefill] // Stable: only depends on triggerRefill, uses ref for state
  );

  // Memoize return value to prevent unnecessary re-renders in consumers
  // All callbacks are now stable (empty deps), so this only changes when isInitialized changes
  return useMemo(
    () => ({
      popImage,
      hasImages,
      isLoading,
      getError,
      refillChamber,
      isInitialized: chambersState.isInitialized,
    }),
    [
      popImage,
      hasImages,
      isLoading,
      getError,
      refillChamber,
      chambersState.isInitialized,
    ]
  );
};
