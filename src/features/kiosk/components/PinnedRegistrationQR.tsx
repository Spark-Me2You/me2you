/**
 * Pinned registration QR — always-visible, styled to look like an open tab.
 * Reads from the global RegistrationQRProvider so the token rotates in sync with other QR consumers.
 */

import { RegistrationQRDisplay } from './RegistrationQRDisplay';

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
      className={`pointer-events-auto fixed z-[1000] flex flex-col items-center gap-2 bg-btn-pink px-4 py-[14px] shadow-glass-card ${side === 'left' ? 'rounded-r-[18px]' : 'rounded-l-[18px]'}`}
      style={{ ...horizontalStyle, ...verticalStyle }}
    >
      <RegistrationQRDisplay size={qrSize} />
      <p className="m-0 text-center font-jersey text-[16px] tracking-[2px] text-white lowercase select-none">{label}</p>
    </div>
  );
};
