/**
 * Typography Tokens
 * Fonts, sizes, and letter-spacing used across the app.
 */

export const typography = {

  // --- Font families ---
  font: {
    condensed:   "'Barlow Condensed', sans-serif",  // main UI font (titles, labels, buttons)
    handwritten: "'Caveat', cursive",               // casual labels (e.g. "back to sign-in")
    jersey:      "'Jersey 10', sans-serif",         // pixel/retro display font
    averia:      "'Averia Libre', cursive",         // soft irregular display font
    system:      'system-ui, Avenir, Helvetica, Arial, sans-serif',
  },

  // --- Font sizes (kiosk-scaled at ~0.74× from 1440×1024 Figma) ---
  fontSize: {
    sm:  '16px',   // small labels, error messages
    md:  '18px',   // handwritten labels
    lg:  '21px',   // buttons
    xl:  '24px',   // field labels
    '2xl': '37px', // title bars, org buttons
    '3xl': '50px', // Figma original (pre-scale reference)
  },

  // --- Font weights ---
  fontWeight: {
    light:  300,
    normal: 400,
    bold:   700,
  },

  // --- Letter spacing ---
  letterSpacing: {
    tight:  '2px',
    normal: '4px',
    wide:   '6px',
    xwide:  '8.5px',
  },

};
