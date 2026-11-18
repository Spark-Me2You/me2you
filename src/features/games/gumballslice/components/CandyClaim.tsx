/**
 * Candy Claim
 * Winner-only claim step on the results screen, same flow as FlapFlap's score
 * claim: tap to generate a QR, scan it with a phone, and the kiosk confirms
 * live when it's claimed.
 */

import React, { useState } from "react";
import { ClaimSection, type ClaimPayload } from "@/features/claim";

interface Props {
  payload: ClaimPayload;
}

export const CandyClaim: React.FC<Props> = ({ payload }) => {
  const [requested, setRequested] = useState(false);
  const [claimed, setClaimed] = useState(false);

  if (claimed) {
    return <p className="m-0 font-jersey text-[clamp(36px,6vh,60px)] tracking-[4px] text-lime/93 [text-shadow:3px_3px_0_rgba(0,0,0,0.45)]">candy claimed! 🍬</p>;
  }

  if (!requested) {
    return (
      <button className="cursor-pointer rounded-[16px] border-[3px] border-solid border-[#ffd700]/60 bg-[#ffd700]/15 px-[clamp(32px,4vw,52px)] py-[clamp(10px,2vh,18px)] font-jersey text-[clamp(28px,4.5vh,42px)] tracking-[4px] text-white transition-all duration-200 ease-[ease] hover:border-[#ffd700] hover:bg-[#ffd700]/25 hover:[transform:scale(1.05)]" onClick={() => setRequested(true)}>
        claim my candy
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="m-0 font-jersey text-[clamp(22px,3.5vh,34px)] tracking-[3px] text-white">scan with your phone</p>
      <ClaimSection payload={payload} onClaimed={() => setClaimed(true)} />
    </div>
  );
};
