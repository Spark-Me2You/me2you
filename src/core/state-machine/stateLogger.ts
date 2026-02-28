/**
 * State Logger
 * TODO: Debug state transitions
 */

import { AppState } from './appStateMachine';

/**
 * Log state transition
 * TODO: Implement state transition logging
 */
export const logStateTransition = (from: AppState, to: AppState) => {
  console.log(`[State Machine] ${from} → ${to}`);
};

/**
 * Log state error
 * TODO: Implement state error logging
 */
export const logStateError = (error: string) => {
  console.error(`[State Machine Error] ${error}`);
};
