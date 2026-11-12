import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AppState } from './appStateMachine';

interface StateContextType {
  currentState: AppState;
  transitionTo: (state: AppState) => void;
}

const StateContext = createContext<StateContextType | undefined>(undefined);

interface StateProviderProps {
  children: React.ReactNode;
}

/** State Provider Component: holds the kiosk's current app state. */
export const StateProvider: React.FC<StateProviderProps> = ({ children }) => {
  const [currentState, setCurrentState] = useState<AppState>(AppState.IDLE);

  const transitionTo = useCallback((state: AppState) => setCurrentState(state), []);
  const value = useMemo(() => ({ currentState, transitionTo }), [currentState, transitionTo]);

  return <StateContext.Provider value={value}>{children}</StateContext.Provider>;
};

/** Hook to access the state machine. */
export const useAppState = () => {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within a StateProvider');
  }
  return context;
};
