import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import { LoginForm } from './LoginForm';
import { GlassCard } from '@/shared/components/GlassCard';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, authMode } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && authMode === 'admin') {
      navigate('/select-org', { replace: true });
    } else if (isAuthenticated && authMode === 'kiosk') {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, authMode, navigate]);

  const handleSubmit = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await signIn(email, password);
      navigate('/select-org', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassCard>

      {/* "admin sign in" title box — independently positioned */}
      <div style={{
        position: 'absolute',
        top: '30px',
        left: '44px',
        width: '400px',
        height: '80px',
        backgroundColor: '#e405ac',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '70px',
        boxSizing: 'border-box',
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 300,
          fontSize: '37px',
          color: 'white',
          letterSpacing: '6px',
          textTransform: 'lowercase',
        }}>
          admin sign in
        </span>
      </div>

      {/* Form fields */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', paddingTop: '74px', paddingBottom: '40px' }}>
        <LoginForm onSubmit={handleSubmit} error={error} isLoading={isLoading} />
      </div>

    </GlassCard>
  );
};
