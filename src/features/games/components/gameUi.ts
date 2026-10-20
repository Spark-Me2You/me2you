/**
 * Shared class recipes for game screens (menus, overlays, buttons).
 * See docs/BRAND_BOOK.md §5 "Game screens".
 */

/** Big lowercase screen title: "flapflap", "drawit" */
export const GAME_TITLE =
  "m-0 font-jersey text-[160px] leading-none tracking-brand text-white lowercase text-shadow-pop";

const BTN =
  "cursor-pointer rounded-glass font-jersey leading-none tracking-brand lowercase shadow-glass-card transition-transform duration-120 ease-out hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100";

/** Menu-sized buttons (launchers, DrawIt menu) */
export const BTN_LG = `${BTN} min-w-[420px] px-15 py-5 text-display-md`;
/** Buttons inside the 1200x900 game canvas and on review screens */
export const BTN_MD = `${BTN} px-12 py-4 text-body-xl`;

/** Main action: lime with ink text so it pops on the purple background */
export const BTN_PRIMARY = "bg-lime text-ink hover:bg-lime-dark";
/** Secondary action: frosted glass with white text */
export const BTN_SECONDARY = "border-2 border-solid border-white/40 bg-glass text-white backdrop-blur-[10px] hover:bg-white/20";

/** Frosted panel on the games background (leaderboards, toolbox) */
export const GAME_PANEL = "border border-solid border-white/20 bg-glass shadow-glass-card backdrop-blur-[10px]";

/** Dimmed overlay over a frozen game canvas (game over) */
export const GAME_OVER_SCRIM = "bg-action-games/85 backdrop-blur-[6px]";
