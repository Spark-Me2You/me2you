/**
 * Pinned registration QR — always-visible, top-right, styled to look like an open tab.
 * Reads from the global RegistrationQRProvider so the token rotates in sync with other QR consumers.
 */

import { RegistrationQRDisplay } from './RegistrationQRDisplay';
import styles from './PinnedRegistrationQR.module.css';

export const PinnedRegistrationQR: React.FC = () => {
  return (
    <div className={styles.container}>
      <RegistrationQRDisplay size={140} />
      <p className={styles.label}>scan to join!</p>
    </div>
  );
};
