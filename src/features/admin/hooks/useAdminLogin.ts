/**
 * useAdminLogin Hook
 * Optional hook for admin login logic
 * Note: Login logic is currently in AdminLoginPage component
 * This hook can be used for more complex login flows
 */

import { useState } from 'react';
import { useAuth } from '@/core/auth';

/**
 * Admin Login Hook
 * Provides login functionality with loading and error states
 */
export const useAdminLogin = () => {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      await signIn(email, password);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, error, isLoading };
};
