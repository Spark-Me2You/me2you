/**
 * Candy Claim
 * Winner-only claim step on the results screen, same flow as FlapFlap's score
 * claim: tap to generate a QR, scan it with a phone, and the kiosk confirms
 * live when it's claimed.
 */

import React, { useState } from "react";
import { ClaimSection, type ClaimPayload } from "@/features/claim";
import styles from "./CandyClaim.module.css";

interface Props {
  payload: ClaimPayload;
}

export const CandyClaim: React.FC<Props> = ({ payload }) => {
  const [requested, setRequested] = useState(false);
  const [claimed, setClaimed] = useState(false);

  if (claimed) {
    return <p className={styles.claimed}>candy claimed! 🍬</p>;
  }

  if (!requested) {
    return (
      <button className={styles.claimButton} onClick={() => setRequested(true)}>
        claim my candy
      </button>
    );
  }

  return (
    <div className={styles.qr}>
      <p className={styles.instruction}>scan with your phone</p>
      <ClaimSection payload={payload} onClaimed={() => setClaimed(true)} />
    </div>
  );
};
