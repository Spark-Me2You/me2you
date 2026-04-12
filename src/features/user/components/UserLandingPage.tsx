/**
 * User Landing Page
 * Mobile sign-in + create account entry point
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import { CreateAccountPrompt } from './CreateAccountPrompt';
import logo from '@/assets/me2you.png';
import styles from './UserLandingPage.module.css';

export const UserLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { signInUser, authMode } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);

  // Redirect if already signed in as user
  if (authMode === 'user') {
    navigate('/user/profile', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signInUser(email, password);
      // Navigate to profile on success
      navigate('/user/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <img src={logo} alt="me2you" className={styles.logo} />

      {/* Admin button - top right */}
      <button
        onClick={() => navigate('/login')}
        className={styles.adminButton}
        type="button"
      >
        admin?
      </button>

      <div className={styles.content}>
        <div className={styles.card}>
          <h1 className={styles.title}>sign in</h1>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                required
                autoComplete="email"
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                required
                autoComplete="current-password"
                disabled={isSubmitting}
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button type="submit" className={styles.signInButton} disabled={isSubmitting}>
              {isSubmitting ? 'signing in...' : 'sign in'}
            </button>
          </form>

          <div className={styles.divider}>
            <span className={styles.dividerText}>or</span>
          </div>

          <button
            type="button"
            className={styles.createButton}
            onClick={() => setShowCreatePrompt(true)}
          >
            create account
          </button>
        </div>
      </div>

      {showCreatePrompt && <CreateAccountPrompt onClose={() => setShowCreatePrompt(false)} />}
    </div>
  );
};
