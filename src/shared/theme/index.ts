/**
 * Theme
 * TODO: Export theme provider and theme object
 */

import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';

export const theme = {
  colors,
  typography,
  spacing,
};

export * from './colors';
export * from './typography';
export * from './spacing';

// TODO: Add ThemeProvider component when needed
