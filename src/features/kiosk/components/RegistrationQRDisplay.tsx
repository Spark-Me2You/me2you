/**
 * Registration QR Display Component
 *
 * Displays the shared rotating registration QR code (4.5-min rotation, 5-min backend expiry).
 * Reads from RegistrationQRProvider so multiple consumers share the same token.
 */

import { QRCodeSVG } from 'qrcode.react';
import { useRegistrationQR } from '../context/RegistrationQRContext';
import styles from './RegistrationQRDisplay.module.css';

interface RegistrationQRDisplayProps {
  className?: string;
  size?: number;
}

export const RegistrationQRDisplay: React.FC<RegistrationQRDisplayProps> = ({
  className,
  size = 260,
}) => {
  const { url, isLoading, error } = useRegistrationQR();

  if (isLoading && !url) {
    return (
      <div className={`${styles.qrContainer} ${className || ''}`}>
        <div className={styles.loadingState}>
          <span className={styles.loadingText}>Loading QR...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.qrContainer} ${className || ''}`}>
        <div className={styles.errorState}>
          <span className={styles.errorText}>QR unavailable</span>
        </div>
      </div>
    );
  }

  if (!url) {
    return null;
  }

  // For dev: Click to navigate to registration URL
  const handleClick = () => {
    window.open(url, '_blank');
  };

  return (
    <div
      className={`${styles.qrContainer} ${className || ''}`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
      title="Click to open registration (dev)"
    >
      <div className={styles.qrWrapper}>
        <QRCodeSVG
          value={url}
          size={size}
          level="M"
          includeMargin={true}
          className={styles.qrCode}
        />
      </div>
    </div>
  );
};
