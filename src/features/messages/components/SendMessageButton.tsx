import { useState, useMemo, useCallback } from 'react';
import { ClaimQR, useClaimQR } from '@/features/claim';
import type { ClaimPayload } from '@/features/claim';
import envelopeClosed from '@/assets/envelope1.png';
import envelopeOpen from '@/assets/openenvelope.png';

const BTN_PRIMARY =
  'cursor-pointer border-0 bg-orange font-jersey tracking-[0.1em] text-white';
const BTN_CANCEL =
  'absolute -translate-x-1/2 cursor-pointer border-0 bg-transparent py-1 font-jersey tracking-[0.1em] text-[#888]';
const ENVELOPE_TEXT = 'm-0 text-center font-jersey tracking-[0.1em] text-[#333]';

interface ClaimSectionProps {
  payload: ClaimPayload;
  onClaimed: () => void;
}

function ClaimSection({ payload, onClaimed }: ClaimSectionProps) {
  const { claim, isGenerating, error, secondsRemaining, regenerate } =
    useClaimQR(payload, { onClaimed });

  return (
    <ClaimQR
      claim={claim}
      isGenerating={isGenerating}
      error={error}
      secondsRemaining={secondsRemaining}
      onRegenerate={regenerate}
    />
  );
}

interface SendMessageButtonProps {
  recipientId: string;
  recipientName: string;
}

export function SendMessageButton({ recipientId, recipientName }: SendMessageButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClaimRequested, setIsClaimRequested] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const payload = useMemo<ClaimPayload>(() => ({
    version: '1.0',
    type: 'message',
    display: {
      title: `Message ${recipientName}`,
      description: 'Send a message',
      icon: 'badge',
    },
    data: { recipient_id: recipientId, recipient_name: recipientName },
  }), [recipientId, recipientName]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setIsClaimRequested(false);
    setClaimed(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsClaimRequested(false);
    setClaimed(false);
  }, []);

  const handleClaimed = useCallback(() => setClaimed(true), []);

  return (
    <>
      {/* Closed-envelope trigger button — fits inside its parent column. */}
      <div
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpen(); }}
        className="relative flex aspect-[3/2] w-[90%] max-w-[200px] cursor-pointer items-center justify-center bg-contain bg-center bg-no-repeat drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
        style={{ backgroundImage: `url(${envelopeClosed})` }}
      >
        <span className="pointer-events-none px-[12%] text-center font-jersey text-[clamp(14px,1.6vw,28px)] tracking-brand text-ink">
          send a message
        </span>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-scrim" onClick={handleClose}>
          {/* Open-envelope panel — content overlaid on top of the open envelope image. */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex aspect-[5/4] w-[min(640px,90vw)] items-center justify-center bg-contain bg-center bg-no-repeat drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            style={{ backgroundImage: `url(${envelopeOpen})` }}
          >
            {claimed ? (
              <div className="absolute top-[45%] right-[20%] bottom-[10%] left-[20%] flex flex-col items-center justify-center gap-3">
                <p className="m-0 font-jersey text-[24px] tracking-[0.1em] text-orange">message sent!</p>
                <button onClick={handleClose} className={`${BTN_PRIMARY} rounded-tag px-7 py-[10px] text-[20px]`}>
                  ok
                </button>
              </div>
            ) : isClaimRequested ? (
              <>
                {/* QR view — text + (smaller) QR sit on the envelope body. */}
                <div className="absolute top-[46%] right-[20%] left-[20%] flex flex-col items-center gap-2">
                  <p className={`${ENVELOPE_TEXT} text-[18px]`}>scan to send a message to {recipientName}</p>
                  <div className="origin-top scale-[0.7]">
                    <ClaimSection payload={payload} onClaimed={handleClaimed} />
                  </div>
                </div>

                {/* Cancel sits on the bottom of the envelope, independent of the content above. */}
                <button onClick={handleClose} className={`${BTN_CANCEL} bottom-[5%] left-[80%] text-[16px]`}>
                  cancel
                </button>
              </>
            ) : (
              <>
                {/* Pre-QR view — top text + generate-qr button stay together. */}
                <div className="absolute top-[45%] right-[20%] left-[20%] flex flex-col items-center gap-[60px]">
                  <p className={`${ENVELOPE_TEXT} text-[20px]`}>send a message to {recipientName}</p>
                  <button
                    onClick={() => setIsClaimRequested(true)}
                    className={`${BTN_PRIMARY} rounded-[12px] px-8 py-3 text-[22px] shadow-[0_2px_4px_rgba(0,0,0,0.2)]`}
                  >
                    generate QR code
                  </button>
                </div>

                {/* Cancel positioned independently — easy to nudge separately. */}
                <button onClick={handleClose} className={`${BTN_CANCEL} bottom-[10%] left-1/2 text-[20px]`}>
                  cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
