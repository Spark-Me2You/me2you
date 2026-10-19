/**
 * Registration QR Display Component
 *
 * Displays the shared rotating registration QR code (4.5-min rotation, 5-min backend expiry).
 * Reads from RegistrationQRProvider so multiple consumers share the same token.
 */

import { QRCodeSVG } from 'qrcode.react';
import { useRegistrationQR } from '../context/RegistrationQRContext';

interface RegistrationQRDisplayProps {
  className?: string;
  size?: number;
}

export const RegistrationQRDisplay: React.FC<RegistrationQRDisplayProps> = ({
  className,
  size = 260,
}) => {
  const { url, isLoading, error } = useRegistrationQR();

  if (isLoading && !url) {
    return (
      <div className={`flex flex-col items-center gap-[10px] ${className || ''}`}>
        <div className="flex h-[174px] w-[174px] items-center justify-center rounded-[16px] bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px]">
          <span className="font-jersey text-[20px] text-[rgba(255,255,255,0.7)] lowercase">Loading QR...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center gap-[10px] ${className || ''}`}>
        <div className="flex h-[174px] w-[174px] items-center justify-center rounded-[16px] bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px]">
          <span className="font-jersey text-[20px] text-[rgba(255,255,255,0.7)] lowercase">QR unavailable</span>
        </div>
      </div>
    );
  }

  if (!url) {
    return null;
  }

  // For dev: Click to navigate to registration URL
  const handleClick = () => {
    window.open(url, '_blank');
  };

  return (
    <div
      className={`flex cursor-pointer flex-col items-center gap-[10px] ${className || ''}`}
      onClick={handleClick}
      title="Click to open registration (dev)"
    >
      <div className="rounded-[12px] bg-white p-[6px]">
        <QRCodeSVG
          value={url}
          size={size}
          level="M"
          includeMargin={true}
          className="block rounded-[8px]"
        />
      </div>
    </div>
  );
};
