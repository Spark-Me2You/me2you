import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClaimScanner } from '../hooks/useClaimScanner';
import type { ClaimPayload } from '../types';
import styles from './ClaimScanner.module.css';

const SCANNER_ELEMENT_ID = 'claim-qr-reader';

interface ClaimScannerProps {
  onClose: () => void;
}

export function ClaimScanner({ onClose }: ClaimScannerProps) {
  const navigate = useNavigate();

  const { isScanning, isProcessing, error, start, stop } = useClaimScanner({
    elementId: SCANNER_ELEMENT_ID,
    onSuccess: (payload: ClaimPayload) => {
      navigate('/claim/success', { state: { payload } });
    },
    onError: () => {
      // error state is shown inline
    },
  });

  useEffect(() => {
    start();
    return () => { stop(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = async () => {
    await stop();
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={handleClose} aria-label="Close scanner">
          ✕
        </button>

        <h2 className={styles.title}>scan a code</h2>

        <div id={SCANNER_ELEMENT_ID} className={styles.scannerContainer} />

        {isProcessing && (
          <div className={styles.status}>claiming...</div>
        )}

        {!isScanning && !isProcessing && error && (
          <div className={styles.error}>{error}</div>
        )}

        {isScanning && !isProcessing && !error && (
          <p className={styles.hint}>point your camera at the kiosk screen</p>
        )}
      </div>
    </div>
  );
}
