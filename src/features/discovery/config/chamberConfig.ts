/**
 * Chamber Configuration
 * Constants for the image batching/pre-loading system
 */

/**
 * Number of images to fetch per batch
 * Adjustable based on average category sizes and performance needs
 */
export const DEFAULT_BATCH_SIZE = 5;

/**
 * Trigger refill when chamber has this many or fewer images remaining
 * Set to 2 to ensure smooth UX - refill happens before running out
 */
export const REFILL_THRESHOLD = 2;

/**
 * Minimum time (in milliseconds) between refill attempts for a category
 * Prevents rapid successive refills and rate-limiting issues
 */
export const MIN_REFILL_INTERVAL_MS = 1000;

/**
 * Warning threshold for signed URL expiry (in milliseconds)
 * Signed URLs from Supabase storage expire after 1 hour
 * This is set to 55 minutes to allow 5-minute buffer for refresh
 * Currently not used, but reserved for future URL refresh feature
 */
export const URL_EXPIRY_WARNING_MS = 55 * 60 * 1000; // 55 minutes
