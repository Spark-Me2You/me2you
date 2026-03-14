/**
 * Admin Login Page
 * Main login page for admin authentication
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import { LoginForm } from './LoginForm';

/**
 * Admin Login Page Component
 * Displays login form and handles authentication flow
 */
export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Redirect to app if already authenticated
   */
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  /**
   * Handle form submission
   * TODO: Currently will throw error because adminAuthService.signInWithEmail is not implemented
   */
  const handleSubmit = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      // Call signIn from auth context
      await signIn(email, password);
      // On success, navigate to app
      navigate('/app', { replace: true });
    } catch (err) {
      // Display error message
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          width: '90%',
          maxWidth: '450px',
        }}
      >
        <h1 style={{ marginBottom: '0.5rem', textAlign: 'center', fontSize: '1.75rem' }}>
          Admin Login
        </h1>
        <p style={{ marginBottom: '2rem', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
          Sign in to access the me2you admin panel
        </p>
        <LoginForm onSubmit={handleSubmit} error={error} isLoading={isLoading} />
      </div>
    </div>
  );
};
