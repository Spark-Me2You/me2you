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
  verticalCenter?: boolean;
}

export const PinnedRegistrationQR: React.FC<PinnedRegistrationQRProps> = ({
  side = 'right',
  top = 24,
  qrSize = 140,
  label = 'scan to join!',
  verticalCenter = false,
}) => {
  const horizontalStyle: React.CSSProperties =
    side === 'left' ? { left: 0 } : { right: 0 };

  const verticalStyle: React.CSSProperties = verticalCenter
    ? { top: '50%', transform: 'translateY(-50%)' }
    : { top };

  return (
    <div
      className={`${styles.container} ${side === 'left' ? styles.left : styles.right}`}
      style={{ ...horizontalStyle, ...verticalStyle }}
    >
      <RegistrationQRDisplay size={qrSize} />
      <p className={styles.label}>{label}</p>
    </div>
  );
};
