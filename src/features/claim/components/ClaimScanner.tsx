import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClaimScanner } from '../hooks/useClaimScanner';
import type { ClaimPayload } from '../types';

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
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-[rgba(0,0,0,0.7)]">
      <div className="relative flex w-[min(90vw,380px)] flex-col items-center gap-4 rounded-[24px] bg-[#fefffb] px-6 pt-8 pb-6">
        <button className="absolute top-4 right-4 cursor-pointer border-0 bg-transparent p-1 text-[20px] leading-none text-[#666] hover:text-[#333]" onClick={handleClose} aria-label="Close scanner">
          ✕
        </button>

        <h2 className="m-0 font-jersey text-[36px] tracking-[2px] text-[#e44805] lowercase">scan a code</h2>

        <div id={SCANNER_ELEMENT_ID} className="min-h-[250px] w-full overflow-hidden rounded-[12px]" />

        {isProcessing && (
          <div className="font-jersey text-[24px] text-[#555] lowercase">claiming...</div>
        )}

        {!isScanning && !isProcessing && error && (
          <div className="w-full rounded-[8px] bg-[rgba(211,47,47,0.1)] px-3 py-2 text-center font-jersey text-[18px] text-[#d32f2f]">{error}</div>
        )}

        {isScanning && !isProcessing && !error && (
          <p className="m-0 text-center font-jersey text-[18px] text-[#888] lowercase">point your camera at the kiosk screen</p>
        )}
      </div>
    </div>
  );
}
