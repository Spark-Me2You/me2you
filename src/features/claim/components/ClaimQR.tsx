import { QRCodeSVG } from 'qrcode.react';
import type { GeneratedClaim } from '../types';

const CONTAINER = 'flex flex-col items-center gap-3';
const PLACEHOLDER =
  'flex h-[252px] w-[252px] flex-col items-center justify-center gap-3 rounded-[16px] bg-[rgba(255,255,255,0.9)] shadow-[0_4px_12px_rgba(0,0,0,0.15)]';
const STATUS_TEXT = 'font-jersey text-[24px] text-[#666] lowercase';
const RETRY_BUTTON =
  'cursor-pointer rounded-[12px] border-2 border-solid border-[#e44805] bg-[rgba(228,72,5,0.1)] px-5 py-2 font-jersey text-[22px] text-[#e44805] lowercase transition-[background] duration-200 ease-[ease] hover:bg-[rgba(228,72,5,0.2)]';

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
      <div className={CONTAINER}>
        <div className={PLACEHOLDER}>
          <span className={STATUS_TEXT}>generating...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={CONTAINER}>
        <div className={PLACEHOLDER}>
          <span className="px-4 text-center font-jersey text-[18px] text-[#d32f2f]">{error}</span>
          <button className={RETRY_BUTTON} onClick={onRegenerate}>retry</button>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className={CONTAINER}>
        <div className={PLACEHOLDER}>
          <span className={STATUS_TEXT}>expired</span>
          <button className={RETRY_BUTTON} onClick={onRegenerate}>refresh</button>
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
    <div className={CONTAINER}>
      <div className="rounded-[16px] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
        <QRCodeSVG
          value={claim.claim_url}
          size={220}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
        />
      </div>
      <div className={`font-jersey text-[28px] tracking-[2px] transition-[color] duration-300 ease-[ease] ${isWarning ? 'text-[#e44805]' : 'text-[#555]'}`}>
        {countdown}
      </div>
    </div>
  );
}
