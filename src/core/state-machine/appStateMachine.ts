/**
 * App State Machine
 * TODO: Define state definitions and transitions (replaces routing)
 */

export const AppState = {
  IDLE: 'IDLE',
  AUTH: 'AUTH',
  ONBOARDING: 'ONBOARDING',
  PROFILE_EDITOR: 'PROFILE_EDITOR',
  MY_PROFILE: 'MY_PROFILE',
  HUB: 'HUB',
  DISCOVERY: 'DISCOVERY',
} as const;

export type AppState = typeof AppState[keyof typeof AppState];

export type StateTransition = {
  from: AppState;
  to: AppState;
  event: string;
};

/**
 * Valid state transitions
 * TODO: Define all valid state transitions
 */
export const transitions: StateTransition[] = [
  { from: AppState.IDLE, to: AppState.AUTH, event: 'USER_DETECTED' },
  { from: AppState.AUTH, to: AppState.ONBOARDING, event: 'NEW_USER' },
  { from: AppState.AUTH, to: AppState.HUB, event: 'EXISTING_USER' },
  { from: AppState.IDLE, to: AppState.DISCOVERY, event: 'TRY_DISCOVERY' },
  { from: AppState.DISCOVERY, to: AppState.IDLE, event: 'EXIT_DISCOVERY' },
  { from: AppState.IDLE, to: AppState.MY_PROFILE, event: 'VIEW_MY_PROFILE' },
  { from: AppState.MY_PROFILE, to: AppState.IDLE, event: 'EXIT_MY_PROFILE' },
  // TODO: Add more transitions
];

/**
 * Check if transition is valid
 * TODO: Implement transition validation
 */
export const canTransition = (_from: AppState, _to: AppState): boolean => {
  // TODO: Implement transition validation logic
  return true;
};
