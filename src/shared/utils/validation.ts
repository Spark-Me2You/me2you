/**
 * Validation Utilities
 * TODO: Common validation functions
 */

/**
 * Validate email format
 * TODO: Implement email validation
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate non-empty string
 * TODO: Implement non-empty validation
 */
export const isNonEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Validate string length
 * TODO: Implement length validation
 */
export const isWithinLength = (value: string, min: number, max: number): boolean => {
  const length = value.trim().length;
  return length >= min && length <= max;
};
