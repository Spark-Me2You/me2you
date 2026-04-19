import React, { useState } from "react";
import QRCode from "react-qr-code";
import styles from "./ReviewScreen.module.css";

interface Props {
  imageDataUrl: string;
  word: string;
  onClaim: () => void;
  onDiscard: () => void;
}

// TODO(drawit): wire the QR claim flow to actually push the drawing to the
// gallery once the account linking endpoint is built.
export const ReviewScreen: React.FC<Props> = ({
  imageDataUrl,
  word,
  onClaim,
  onDiscard,
}) => {
  const [showQr, setShowQr] = useState(false);

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Your drawing of "{word}"</h2>
      <img src={imageDataUrl} alt={`Drawing of ${word}`} className={styles.preview} />

      {!showQr && (
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              setShowQr(true);
              onClaim();
            }}
          >
            Claim & Send to Gallery
          </button>
          <button type="button" className={styles.secondary} onClick={onDiscard}>
            Discard
          </button>
        </div>
      )}

      {showQr && (
        <div className={styles.qrPanel}>
          <p className={styles.qrLabel}>
            Scan to claim — your drawing will appear in the gallery after you link it to your account.
          </p>
          <QRCode value={`me2you://drawit/claim?word=${encodeURIComponent(word)}`} size={200} />
          <button type="button" className={styles.secondary} onClick={onDiscard}>
            Done
          </button>
        </div>
      )}
    </div>
  );
};
