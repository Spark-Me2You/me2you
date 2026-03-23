import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import { LoginForm } from './LoginForm';
import { GlassCard } from '@/shared/components/GlassCard';
import styles from './AdminLoginPage.module.css';

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
      <div className={styles.titleBox}>
        <span className={styles.titleText}>admin sign in</span>
      </div>

      {/* Form fields */}
      <div className={styles.formWrapper}>
        <LoginForm onSubmit={handleSubmit} error={error} isLoading={isLoading} />
      </div>

    </GlassCard>
  );
};
