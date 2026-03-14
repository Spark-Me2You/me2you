/**
 * User Session Module
 * Handles user authentication via card swipe and session management
 * TODO: Implement card swipe authentication and session management
 */

export * from './components/CardSwipePrompt';
export * from './components/SessionTimeoutWarning';
export * from './components/LogoutButton';
export * from './hooks/useSession';
export * from './hooks/useCardReader';
export * from './hooks/useInactivityTimer';
export * from './services/sessionService';
