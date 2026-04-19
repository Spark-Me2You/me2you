import React, { useState } from "react";
import QRCode from "react-qr-code";
import styles from "./ReviewScreen.module.css";

interface Props {
  imageDataUrl: string;
  word: string;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
  onDiscard: () => void;
  onClaim: () => void;
}

// TODO(drawit): integrate nsfwjs here once scope expands.
export const ReviewScreen: React.FC<Props> = ({
  imageDataUrl,
  word,
  submitting,
  error,
  onSubmit,
  onDiscard,
  onClaim,
}) => {
  const [showQr, setShowQr] = useState(false);

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Your drawing of "{word}"</h2>
      <img src={imageDataUrl} alt={`Drawing of ${word}`} className={styles.preview} />

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.buttons}>
        <button className={styles.primary} onClick={onSubmit} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit to Gallery"}
        </button>
        <button className={styles.secondary} onClick={onDiscard} disabled={submitting}>
          Discard
        </button>
        <button
          className={styles.secondary}
          onClick={() => {
            setShowQr(true);
            onClaim();
          }}
          disabled={submitting}
        >
          Claim to Account
        </button>
      </div>

      {showQr && (
        <div className={styles.qrPanel}>
          <p className={styles.qrLabel}>Scan to claim</p>
          <QRCode value={`me2you://drawit/claim?word=${encodeURIComponent(word)}`} size={180} />
        </div>
      )}
    </div>
  );
};
