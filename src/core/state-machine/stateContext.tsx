import React, { createContext, useContext, useState } from 'react';
import { AppState } from './appStateMachine';

interface StateContextType {
  currentState: AppState;
  transitionTo: (state: AppState) => void;
}

const StateContext = createContext<StateContextType | undefined>(undefined);

interface StateProviderProps {
  children: React.ReactNode;
}

/**
 * State Provider Component
 * TODO: Implement state machine context provider
 */
export const StateProvider: React.FC<StateProviderProps> = ({ children }) => {
  const [currentState, setCurrentState] = useState<AppState>(AppState.IDLE);

  const transitionTo = (state: AppState) => {
    // TODO: Implement state transition with validation
    setCurrentState(state);
  };

  return (
    <StateContext.Provider value={{ currentState, transitionTo }}>
      {children}
    </StateContext.Provider>
  );
};

/**
 * Hook to access state machine
 * TODO: Implement state machine hook
 */
export const useAppState = () => {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within a StateProvider');
  }
  return context;
};
