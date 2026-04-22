import { QRCodeSVG } from 'qrcode.react';
import type { GeneratedClaim } from '../types';
import styles from './ClaimQR.module.css';

interface ClaimQRProps {
  claim: GeneratedClaim | null;
  isGenerating: boolean;
  error: string | null;
  secondsRemaining: number;
  onRegenerate: () => void;
}

export function ClaimQR({ claim, isGenerating, error, secondsRemaining, onRegenerate }: ClaimQRProps) {
  const isExpired = claim !== null && secondsRemaining === 0;

  if (isGenerating) {
    return (
      <div className={styles.container}>
        <div className={styles.placeholder}>
          <span className={styles.loadingText}>generating...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.placeholder}>
          <span className={styles.errorText}>{error}</span>
          <button className={styles.retryButton} onClick={onRegenerate}>retry</button>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className={styles.container}>
        <div className={styles.placeholder}>
          <span className={styles.expiredText}>expired</span>
          <button className={styles.retryButton} onClick={onRegenerate}>refresh</button>
        </div>
      </div>
    );
  }

  if (!claim) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const countdown = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const isWarning = secondsRemaining <= 60;

  return (
    <div className={styles.container}>
      <div className={styles.qrWrapper}>
        <QRCodeSVG
          value={claim.claim_url}
          size={220}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
        />
      </div>
      <div className={`${styles.countdown} ${isWarning ? styles.countdownWarning : ''}`}>
        {countdown}
      </div>
    </div>
  );
}
