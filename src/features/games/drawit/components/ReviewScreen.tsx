import React, { useState } from "react";
import QRCode from "react-qr-code";
import nextButton from "../../../../assets/next_button.svg";
import styles from "./ReviewScreen.module.css";

interface Props {
  imageDataUrl: string;
  word: string;
  onClaim: () => void;
  onDiscard: () => void;
  onContinue: () => void;
}

// TODO(drawit): wire the QR claim flow to actually push the drawing to the
// gallery once the account linking endpoint is built.
export const ReviewScreen: React.FC<Props> = ({
  imageDataUrl,
  word,
  onClaim,
  onDiscard,
  onContinue,
}) => {
  const [showQr, setShowQr] = useState(false);

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Your drawing of "{word}"</h2>
      <img src={imageDataUrl} alt={`Drawing of ${word}`} className={styles.preview} />

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

      {showQr && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Scan to Claim</h3>
            <p className={styles.modalSubtitle}>
              Your drawing will appear in the gallery after you link it to your account.
            </p>
            <div className={styles.qrWrap}>
              <QRCode
                value={`me2you://drawit/claim?word=${encodeURIComponent(word)}`}
                size={220}
              />
            </div>
            <button
              type="button"
              className={styles.nextArrow}
              aria-label="Continue"
              onClick={onContinue}
            >
              <img src={nextButton} alt="" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
