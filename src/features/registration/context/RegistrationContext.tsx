/**
 * Registration Context
 *
 * Provides organization information throughout the registration flow.
 * This context is populated after validating the QR code token.
 */

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

export interface RegistrationContextType {
  org_id: string;
  org_name: string;
}

const RegistrationContext = createContext<RegistrationContextType | null>(null);

interface RegistrationProviderProps {
  context: RegistrationContextType;
  children: ReactNode;
}

/**
 * Registration Provider
 *
 * Wraps the registration flow with organization context from validated token.
 *
 * @param context - Organization info from token validation
 * @param children - Registration flow components
 */
export const RegistrationProvider: React.FC<RegistrationProviderProps> = ({
  context,
  children,
}) => {
  return (
    <RegistrationContext.Provider value={context}>
      {children}
    </RegistrationContext.Provider>
  );
};

/**
 * Use Registration Context Hook
 *
 * Accesses organization info during registration.
 * Must be used within RegistrationProvider.
 *
 * @returns Organization ID and name
 * @throws Error if used outside RegistrationProvider
 */
export const useRegistrationContext = (): RegistrationContextType => {
  const context = useContext(RegistrationContext);

  if (!context) {
    throw new Error(
      "useRegistrationContext must be used within RegistrationProvider",
    );
  }

  return context;
};
