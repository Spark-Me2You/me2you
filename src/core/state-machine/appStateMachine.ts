/**
 * App State Machine
 * The kiosk's top-level screens (replaces routing). Views move between them with `transitionTo`.
 */

export const AppState = {
  IDLE: 'IDLE',
  HUB: 'HUB',
  DISCOVERY: 'DISCOVERY',
  GAMES: 'GAMES',
} as const;

export type AppState = typeof AppState[keyof typeof AppState];
