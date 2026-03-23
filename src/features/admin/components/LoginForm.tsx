import React, { useState } from 'react';
import styles from './LoginForm.module.css';
import { colors } from '@/shared/theme/colors';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, error, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>

      {/* Email field */}
      <div className={`${styles.fieldBox} ${styles.emailBox}`}>
        <span className={styles.fieldLabel}>email:</span>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          className={styles.fieldInput}
        />
      </div>

      {/* Password field */}
      <div className={`${styles.fieldBox} ${styles.passwordBox}`}>
        <span className={styles.fieldLabel}>password:</span>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          className={styles.fieldInput}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className={styles.errorBox}>{error}</div>
      )}

      {/* Submit button */}
      <div className={styles.submitWrapper}>
        <button
          type="submit"
          disabled={isLoading}
          className={styles.submitBtn}
          style={{
            backgroundColor: isLoading ? colors.magentaDim : colors.magenta,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'signing in...' : 'sign in'}
        </button>
      </div>

    </form>
  );
};
