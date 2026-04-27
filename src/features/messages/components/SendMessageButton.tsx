import { useState, useMemo, useCallback } from 'react';
import { ClaimQR, useClaimQR } from '@/features/claim';
import type { ClaimPayload } from '@/features/claim';
import envelopeClosed from '@/assets/envelope1.png';
import envelopeOpen from '@/assets/openenvelope.png';

const ORANGE = '#e44805';

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
        style={{
          position: 'relative',
          width: '90%',
          maxWidth: 200,
          aspectRatio: '3 / 2',
          backgroundImage: `url(${envelopeClosed})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.25))',
        }}
      >
        <span style={{
          fontFamily: "'Jersey 10', sans-serif",
          fontSize: 'clamp(14px, 1.6vw, 28px)',
          letterSpacing: '0.17em',
          color: '#000000',
          textAlign: 'center',
          padding: '0 12%',
          pointerEvents: 'none',
        }}>
          send a message
        </span>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={handleClose}
        >
          {/* Open-envelope panel — content overlaid on top of the open envelope image. */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: 'min(640px, 90vw)',
              aspectRatio: '5 / 4',
              backgroundImage: `url(${envelopeOpen})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.35))',
            }}
          >
            {claimed ? (
              <div
                style={{
                  position: 'absolute',
                  top: '45%',
                  left: '20%',
                  right: '20%',
                  bottom: '10%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                }}
              >
                <p style={{ fontFamily: "'Jersey 10', sans-serif", fontSize: 24, letterSpacing: '0.1em', margin: 0, color: ORANGE }}>
                  message sent!
                </p>
                <button
                  onClick={handleClose}
                  style={{
                    fontFamily: "'Jersey 10', sans-serif",
                    fontSize: 20,
                    letterSpacing: '0.1em',
                    color: '#fff',
                    background: ORANGE,
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 28px',
                    cursor: 'pointer',
                  }}
                >
                  ok
                </button>
              </div>
            ) : isClaimRequested ? (
              <>
                {/* QR view — text + (smaller) QR sit on the envelope body. */}
                <div
                  style={{
                    position: 'absolute',
                    top: '46%',
                    left: '20%',
                    right: '20%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <p style={{ fontFamily: "'Jersey 10', sans-serif", fontSize: 18, letterSpacing: '0.1em', margin: 0, color: '#333', textAlign: 'center' }}>
                    scan to send a message to {recipientName}
                  </p>
                  <div style={{ transform: 'scale(0.7)', transformOrigin: 'top center' }}>
                    <ClaimSection payload={payload} onClaimed={handleClaimed} />
                  </div>
                </div>

                {/* Cancel sits on the bottom of the envelope, independent of the content above. */}
                <button
                  onClick={handleClose}
                  style={{
                    position: 'absolute',
                    bottom: '5%',
                    left: '80%',
                    transform: 'translateX(-50%)',
                    fontFamily: "'Jersey 10', sans-serif",
                    fontSize: 16,
                    letterSpacing: '0.1em',
                    color: '#888',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 0',
                  }}
                >
                  cancel
                </button>
              </>
            ) : (
              <>
                {/* Pre-QR view — top text + generate-qr button stay together. */}
                <div
                  style={{
                    position: 'absolute',
                    top: '45%',
                    left: '20%',
                    right: '20%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 60,
                  }}
                >
                  <p style={{ fontFamily: "'Jersey 10', sans-serif", fontSize: 20, letterSpacing: '0.1em', margin: 0, color: '#333', textAlign: 'center' }}>
                    send a message to {recipientName}
                  </p>
                  <button
                    onClick={() => setIsClaimRequested(true)}
                    style={{
                      fontFamily: "'Jersey 10', sans-serif",
                      fontSize: 22,
                      letterSpacing: '0.1em',
                      color: '#fff',
                      background: ORANGE,
                      border: 'none',
                      borderRadius: 12,
                      padding: '12px 32px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  >
                    generate QR code
                  </button>
                </div>

                {/* Cancel positioned independently — easy to nudge separately. */}
                <button
                  onClick={handleClose}
                  style={{
                    position: 'absolute',
                    bottom: '10%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontFamily: "'Jersey 10', sans-serif",
                    fontSize: 20,
                    letterSpacing: '0.1em',
                    color: '#888',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 0',
                  }}
                >
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
