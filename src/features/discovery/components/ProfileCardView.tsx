/**
 * Profile Card View
 * Full-screen expanded profile view — matches Figma "other profile (NOT LOGGED IN)" (node 538:564).
 * Used by both Discovery and Hub when a user card is tapped.
 */

import React from 'react';
import type { RandomImageData } from '../types/image';
import me2youLogo from '@/assets/me2you.png';

const ORANGE = '#e44805';
const PURPLE_GLASS = 'rgba(113, 5, 228, 0.93)';
const GREEN_GLASS = 'rgba(211, 228, 5, 0.93)';
const GLASS_INSET =
  'inset 0px 0px 4px 0px rgba(0,0,0,0.25), inset 1px 1px 49.9px 14px rgba(255,255,255,0.2)';
const BOX_INSET =
  'inset -1px -1px 4px 0px rgba(0,0,0,0.25), inset 0px 4px 4px 0px rgba(0,0,0,0.25)';

interface ProfileCardViewProps {
  profileData: RandomImageData;
  onBack: () => void;
  /** Label shown on the back side-tab. Defaults to "back to discovery" */
  backLabel?: string;
  /** If provided, shows a "home" side-tab that calls this handler */
  onHome?: () => void;
}

export const ProfileCardView: React.FC<ProfileCardViewProps> = ({
  profileData,
  onBack,
  backLabel = 'back to discovery',
  onHome,
}) => {
  if (!profileData || !profileData.owner) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            fontFamily: "'Averia Libre', sans-serif",
            fontSize: '2rem',
            color: '#fff',
          }}
        >
          Profile missing
        </p>
      </div>
    );
  }

  const { owner, imageUrl } = profileData;

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>

      {/* ── Main frosted glass card ───────────────────────────────────────── */}
      {/* Extends slightly off-screen to the left (-4.9%) to fill the visual space
          before the right-side navigation tabs (which start at 94.43%) */}
      <div
        style={{
          position: 'absolute',
          top: '8.61%',
          left: '-4.9%',
          right: '16.28%',
          bottom: '8.67%',
          backgroundColor: 'rgba(255, 255, 255, 0.13)',
          borderRadius: 46,
          boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Two-column interior */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            gap: '3%',
            padding: '5% 4% 5% 8%',
          }}
        >
          {/* ── Left column: photo · name · pronouns · major ── */}
          <div
            style={{
              flex: '0 0 32%',
              display: 'flex',
              flexDirection: 'column',
              gap: '4%',
            }}
          >
            {/* Photo frame */}
            <div
              style={{
                width: '100%',
                aspectRatio: '1.04',
                backgroundColor: '#fff',
                borderRadius: 74,
                overflow: 'hidden',
                boxShadow: BOX_INSET,
                flexShrink: 0,
              }}
            >
              <img
                src={imageUrl}
                alt={`${owner.name}'s profile`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.src = me2youLogo;
                }}
              />
            </div>

            {/* Name */}
            <p
              style={{
                fontFamily: "'Jersey 10', sans-serif",
                fontSize: 'clamp(36px, 6.5vw, 128px)',
                letterSpacing: '0.17em',
                color: '#000',
                margin: 0,
                lineHeight: 1,
              }}
            >
              {owner.name}
            </p>

            {/* Pronouns bar */}
            {owner.pronouns && (
              <div
                style={{
                  backgroundColor: ORANGE,
                  padding: '6px 14px',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Jersey 10', sans-serif",
                    fontSize: 'clamp(16px, 2.6vw, 48px)',
                    letterSpacing: '0.17em',
                    color: '#000',
                  }}
                >
                  {owner.pronouns}
                </span>
              </div>
            )}

            {/* Major / title bar */}
            {owner.major && (
              <div
                style={{
                  backgroundColor: ORANGE,
                  padding: '6px 14px',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Jersey 10', sans-serif",
                    fontSize: 'clamp(16px, 2.6vw, 48px)',
                    letterSpacing: '0.17em',
                    color: '#000',
                  }}
                >
                  {owner.major}
                </span>
              </div>
            )}
          </div>

          {/* ── Right column: status · interests ── */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '5%',
              paddingTop: '0.5%',
            }}
          >
            {/* Status */}
            <div>
              <div
                style={{
                  backgroundColor: ORANGE,
                  display: 'inline-block',
                  padding: '4px 12px',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Jersey 10', sans-serif",
                    fontSize: 'clamp(16px, 2.6vw, 48px)',
                    letterSpacing: '0.17em',
                    color: '#000',
                  }}
                >
                  status:
                </span>
              </div>
              <div
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 10,
                  padding: '12px 18px',
                  boxShadow: BOX_INSET,
                }}
              >
                <p
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 'clamp(12px, 1.4vw, 20px)',
                    letterSpacing: '-0.04em',
                    color: '#000',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {owner.status || '—'}
                </p>
              </div>
            </div>

            {/* Interests */}
            <div>
              <div
                style={{
                  backgroundColor: ORANGE,
                  display: 'inline-block',
                  padding: '4px 12px',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Jersey 10', sans-serif",
                    fontSize: 'clamp(16px, 2.6vw, 48px)',
                    letterSpacing: '0.17em',
                    color: '#000',
                  }}
                >
                  interests:
                </span>
              </div>
              <div
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 10,
                  padding: '12px 18px',
                  boxShadow: BOX_INSET,
                }}
              >
                {Array.isArray(owner.interests) && owner.interests.length > 0 ? (
                  <ul
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 'clamp(12px, 1.4vw, 20px)',
                      letterSpacing: '-0.04em',
                      color: '#000',
                      margin: 0,
                      paddingLeft: '1.5em',
                      lineHeight: 1.8,
                    }}
                  >
                    {owner.interests.map((interest, i) => (
                      <li key={i}>{interest}</li>
                    ))}
                  </ul>
                ) : (
                  <p
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 'clamp(12px, 1.4vw, 20px)',
                      color: '#999',
                      margin: 0,
                      fontStyle: 'italic',
                    }}
                  >
                    nothing listed yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card glass inset sheen */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            boxShadow: GLASS_INSET,
          }}
        />
      </div>

      {/* ── "want to add as a friend?" — purple glass card ────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: '82.97%',
          left: '60.17%',
          right: '23.61%',
          bottom: '4.72%',
          backgroundColor: PURPLE_GLASS,
          borderRadius: 10,
          boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
        }}
      >
        <p
          style={{
            fontFamily: "'Averia Libre', sans-serif",
            fontSize: 'clamp(10px, 1.5vw, 21px)',
            letterSpacing: '0.17em',
            color: '#fff',
            margin: 0,
            lineHeight: 1.5,
            whiteSpace: 'pre-line',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {`want to add as a friend?\ncreate an account!`}
        </p>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            boxShadow: GLASS_INSET,
          }}
        />
      </div>

      {/* ── "scan me!" — green glass card (QR placeholder) ───────────────── */}
      <div
        style={{
          position: 'absolute',
          top: '59.78%',
          left: '83.64%',
          right: '4.84%',
          bottom: '14.36%',
          backgroundColor: GREEN_GLASS,
          borderRadius: 10,
          boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '8% 6%',
          gap: '8%',
        }}
      >
        <p
          style={{
            fontFamily: "'Averia Libre', sans-serif",
            fontSize: 'clamp(10px, 1.5vw, 21px)',
            letterSpacing: '0.17em',
            color: '#fff',
            margin: 0,
            alignSelf: 'flex-start',
            position: 'relative',
            zIndex: 1,
          }}
        >
          scan me!
        </p>
        {/* QR code placeholder — replace with qrcode.react when ready */}
        <div
          style={{
            flex: 1,
            width: '100%',
            backgroundColor: 'rgba(255,255,255,0.25)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 'clamp(10px, 1vw, 14px)',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            QR
          </span>
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            boxShadow: GLASS_INSET,
          }}
        />
      </div>

      {/* ── Back tab — orange pill, right edge (top half) ─────────────────── */}
      <div
        onClick={onBack}
        style={{
          position: 'absolute',
          top: '8.06%',
          left: '94.43%',
          right: '-1.3%',
          bottom: '46.48%',
          backgroundColor: 'rgba(228, 72, 5, 0.93)',
          borderRadius: 46,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.25)',
        }}
      >
        <span
          style={{
            transform: 'rotate(-90deg)',
            whiteSpace: 'nowrap',
            fontFamily: "'Averia Libre', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(12px, 2.2vw, 33px)',
            color: '#fff',
            letterSpacing: '5.61px',
          }}
        >
          {backLabel}
        </span>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            boxShadow: GLASS_INSET,
          }}
        />
      </div>

      {/* ── Home tab — purple pill, right edge (bottom half) ─────────────── */}
      {onHome && (
        <div
          onClick={onHome}
          style={{
            position: 'absolute',
            top: '57.69%',
            left: '94.43%',
            right: '-1.3%',
            bottom: '8.7%',
            backgroundColor: PURPLE_GLASS,
            borderRadius: 46,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.25)',
          }}
        >
          <span
            style={{
              transform: 'rotate(-90deg)',
              whiteSpace: 'nowrap',
              fontFamily: "'Averia Libre', sans-serif",
              fontSize: 'clamp(12px, 2.2vw, 33px)',
              color: '#fff',
              letterSpacing: '5.61px',
            }}
          >
            home
          </span>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              pointerEvents: 'none',
              boxShadow: GLASS_INSET,
            }}
          />
        </div>
      )}
    </div>
  );
};
