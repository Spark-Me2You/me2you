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

      {/* "admin sign in" title — independently positioned */}
      <div className="absolute top-[30px] left-0 box-border flex h-[80px] w-[400px] items-center bg-magenta pl-[70px]">
        <span className="font-averia text-[37px] font-light tracking-[6px] text-white lowercase">admin sign in</span>
      </div>

      {/* Form fields */}
      <div className="flex w-full flex-col items-start pt-[90px] pb-10">
        <LoginForm onSubmit={handleSubmit} error={error} isLoading={isLoading} />
      </div>

    </GlassCard>
  );
};
