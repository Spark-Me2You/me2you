/**
 * Registration Error Component
 *
 * Displays user-friendly error messages when QR code validation fails.
 * Different messaging for different error scenarios.
 */

import logo from '@/assets/me2you.png';
import styles from './RegistrationError.module.css';

interface RegistrationErrorProps {
  message: string;
  errorCode?: string;
}

export const RegistrationError: React.FC<RegistrationErrorProps> = ({ message, errorCode }) => {
  // Get specific hint based on error code
  const getHint = () => {
    switch (errorCode) {
      case 'TOKEN_EXPIRED':
        return 'QR codes refresh every 5 minutes for security.';
      case 'NONCE_ALREADY_USED':
        return 'Each QR code can only be used once.';
      case 'INVALID_TOKEN':
        return 'The QR code may be corrupted or invalid.';
      default:
        return null;
    }
  };

  const hint = getHint();

  return (
    <div className={styles.page}>
      <img src={logo} alt="me2you" className={styles.logo} />

      <div className={styles.content}>
        <div className={styles.errorCard}>
          <h2 className={styles.errorTitle}>Unable to Register</h2>

          <p className={styles.errorMessage}>{message}</p>

          {hint && <p className={styles.hint}>{hint}</p>}

          <div className={styles.instruction}>
            <p>Please return to the kiosk and scan a fresh QR code to register.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
