/**
 * Registration QR Display Component
 *
 * Displays a dynamically generated QR code for user registration.
 * The QR code:
 * - Rotates every 4.5 minutes (before 5-minute expiration)
 * - Contains a signed JWT token with organization ID
 * - Links to /register?token=xxx
 *
 * Only visible when kiosk is in IDLE state.
 */

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { kioskQrService } from '@/core/supabase/kioskQrService';
import styles from './RegistrationQRDisplay.module.css';

interface RegistrationQRDisplayProps {
  className?: string;
}

export const RegistrationQRDisplay: React.FC<RegistrationQRDisplayProps> = ({ className }) => {
  const [qrData, setQrData] = useState<{ url: string; expiresAt: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch new QR code
  const fetchQrCode = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await kioskQrService.generateRegistrationQR();

      if (!response.url || !response.expires_at) {
        throw new Error('Invalid response from QR generation service');
      }

      setQrData({
        url: response.url,
        expiresAt: response.expires_at,
      });
      setIsLoading(false);
    } catch (err) {
      console.error('[RegistrationQRDisplay] Failed to fetch QR code:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
      setIsLoading(false);
    }
  };

  // Initial fetch and rotation every 4.5 minutes (before expiration)
  useEffect(() => {
    fetchQrCode();
    const interval = setInterval(fetchQrCode, 270000); // 4.5 minutes = 270,000ms
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !qrData) {
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

  if (!qrData) {
    return null;
  }

  // For dev: Click to navigate to registration URL
  const handleClick = () => {
    window.open(qrData.url, '_blank');
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
          value={qrData.url}
          size={260}
          level="M"
          includeMargin={true}
          className={styles.qrCode}
        />
      </div>
    </div>
  );
};
