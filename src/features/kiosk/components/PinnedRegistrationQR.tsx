/**
 * Pinned registration QR — always-visible, styled to look like an open tab.
 * Reads from the global RegistrationQRProvider so the token rotates in sync with other QR consumers.
 */

import { RegistrationQRDisplay } from './RegistrationQRDisplay';
import styles from './PinnedRegistrationQR.module.css';

interface PinnedRegistrationQRProps {
  side?: 'left' | 'right';
  top?: number;
  qrSize?: number;
  label?: string;
}

export const PinnedRegistrationQR: React.FC<PinnedRegistrationQRProps> = ({
  side = 'right',
  top = 24,
  qrSize = 140,
  label = 'scan to join!',
}) => {
  const positionStyle: React.CSSProperties =
    side === 'left' ? { top, left: 0 } : { top, right: 0 };

  return (
    <div
      className={`${styles.container} ${side === 'left' ? styles.left : styles.right}`}
      style={positionStyle}
    >
      <RegistrationQRDisplay size={qrSize} />
      <p className={styles.label}>{label}</p>
    </div>
  );
};
