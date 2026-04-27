import { useState, useMemo, useCallback } from 'react';
import { ClaimQR, useClaimQR } from '@/features/claim';
import type { ClaimPayload } from '@/features/claim';

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
      <div
        onClick={handleOpen}
        style={{
          display: 'inline-block',
          marginTop: '8%',
          backgroundColor: ORANGE,
          padding: '8px 18px',
          borderRadius: 8,
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
        }}
      >
        <span style={{
          fontFamily: "'Jersey 10', sans-serif",
          fontSize: 'clamp(12px, 1.8vw, 28px)',
          letterSpacing: '0.17em',
          color: '#fff',
        }}>
          send message
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
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: '32px 40px',
              minWidth: 320,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {claimed ? (
              <>
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
              </>
            ) : (
              <>
                <p style={{ fontFamily: "'Jersey 10', sans-serif", fontSize: 20, letterSpacing: '0.1em', margin: 0, color: '#333', textAlign: 'center' }}>
                  {isClaimRequested ? `scan to send a message to ${recipientName}` : `send a message to ${recipientName}`}
                </p>
                {isClaimRequested ? (
                  <ClaimSection payload={payload} onClaimed={handleClaimed} />
                ) : (
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
                    generate qr
                  </button>
                )}
                <button
                  onClick={handleClose}
                  style={{
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
            )}
          </div>
        </div>
      )}
    </>
  );
}
