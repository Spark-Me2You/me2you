/**
 * Profile Card View
 * Full-screen expanded profile view — matches Figma "other profile (NOT LOGGED IN)" (node 538:564).
 * Used by both Discovery and Hub when a user card is tapped.
 */

import React from 'react';
import type { RandomImageData } from '../types/image';
import me2youLogo from '@/assets/me2you.png';
import registerQr from '@/assets/registerqr.png';

const ORANGE = '#e44805';
const GLASS_INSET =
  'inset 0px 0px 4px 0px rgba(0,0,0,0.25), inset 1px 1px 49.9px 14px rgba(255,255,255,0.2)';
const BOX_INSET =
  'inset -1px -1px 4px 0px rgba(0,0,0,0.25), inset 0px 4px 4px 0px rgba(0,0,0,0.25)';
const QR_BOX_SHADOW =
  'inset 0 0 4px 0 rgba(0,0,0,0.25), inset 1px 1px 49.9px 14px rgba(255,255,255,0.20), 0 4px 4px 0 rgba(0,0,0,0.25)';

const TAPE_STYLE: React.CSSProperties = {
  position: 'absolute',
  width: 42,
  height: 10,
  background: 'rgba(211, 228, 5, 0.68)',
  transform: 'rotate(146.367deg)',
  pointerEvents: 'none',
  zIndex: 2,
};

const TEXT_STYLE: React.CSSProperties = {
  color: '#000',
  fontFamily: '"Andale Mono", monospace',
  fontSize: 36,
  fontStyle: 'normal',
  fontWeight: 400,
  lineHeight: 'normal',
  letterSpacing: '-1.44px',
  margin: 0,
};

interface ProfileCardViewProps {
  profileData: RandomImageData;
  onBack: () => void;
  backLabel?: string;
  onHome?: () => void;
}

const FractalBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: 'relative', width: '70%', minHeight: '90px' }}>
    <div style={{ ...TAPE_STYLE, top: -5, left: -10 }} />
    <div style={{ ...TAPE_STYLE, bottom: -5, right: -10 }} />

    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="fractal-box" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency="0.25 0.25" numOctaves={3} seed={805} />
          <feDisplacementMap in="shape" scale={8} xChannelSelector="R" yChannelSelector="G" result="displacedImage" width="100%" height="100%" />
          <feMerge>
            <feMergeNode in="displacedImage" />
          </feMerge>
        </filter>
      </defs>
      <rect
        x="0" y="0" width="100%" height="100%"
        fill="rgba(255, 255, 255, 0.85)"
        stroke="rgba(180, 180, 180, 0.93)"
        filter="url(#fractal-box)"
      />
    </svg>
    <div style={{ position: 'relative', zIndex: 1, padding: '10px 14px' }}>
      {children}
    </div>
  </div>
);

export const ProfileCardView: React.FC<ProfileCardViewProps> = ({
  profileData,
  onBack,
}) => {
  if (!profileData || !profileData.owner) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: "'Averia Libre', sans-serif", fontSize: '2rem', color: '#fff' }}>
          Profile missing
        </p>
      </div>
    );
  }

  const { owner, imageUrl } = profileData;

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>

      {/* ── Exit button ── */}
      <div
        onClick={onBack}
        style={{
          position: 'absolute',
          top: '2%',
          left: '4%',
          width: 183,
          height: 81,
          borderRadius: 13,
          border: '1px solid #58E7F7',
          background: '#F00',
          boxShadow: '0 4px 4px 0 rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        <span style={{ fontFamily: "'Averia Libre', sans-serif", fontWeight: 700, fontSize: 28, color: '#fff', letterSpacing: '0.1em' }}>
          exit
        </span>
      </div>

      {/* ── Main frosted glass card ── */}
      <div
        style={{
          position: 'absolute',
          top: '14%',
          left: '4%',
          right: '26%',
          bottom: '8%',
          backgroundColor: 'rgba(255, 255, 255, 0.13)',
          borderRadius: 46,
          boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: '3%', padding: '5% 4% 5% 8%' }}>

          {/* ── Left column ── */}
          <div style={{ flex: '0 0 32%', display: 'flex', flexDirection: 'column', gap: '2.5%', minHeight: 0, overflow: 'hidden' }}>
            <div style={{ flex: '0 0 57%', width: '100%', minHeight: 0, backgroundColor: '#fff', borderRadius: 74, overflow: 'hidden', boxShadow: BOX_INSET }}>
              <img
                src={imageUrl}
                alt={`${owner.name}'s profile`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.src = me2youLogo; }}
              />
            </div>

            <p style={{ fontFamily: "'Jersey 10', sans-serif", fontSize: 'clamp(24px, 4.5vw, 128px)', letterSpacing: '0.17em', color: '#000', margin: 0, lineHeight: 1, flexShrink: 0 }}>
              {owner.name}
            </p>

            {owner.pronouns && (
              <div style={{ alignSelf: 'flex-start', backgroundColor: ORANGE, padding: '6px 14px', paddingRight: '48px', flexShrink: 0, marginTop: '2%' }}>
                <span style={{ fontFamily: "'Jersey 10', sans-serif", fontSize: 'clamp(12px, 1.8vw, 32px)', letterSpacing: '0.17em', color: '#000' }}>
                  {owner.pronouns}
                </span>
              </div>
            )}

            {owner.major && (
              <div style={{ alignSelf: 'flex-start', backgroundColor: ORANGE, padding: '6px 14px', paddingRight: '48px', flexShrink: 0 }}>
                <span style={{ fontFamily: "'Jersey 10', sans-serif", fontSize: 'clamp(12px, 1.8vw, 32px)', letterSpacing: '0.17em', color: '#000' }}>
                  {owner.major}
                </span>
              </div>
            )}
          </div>

          {/* ── Right column ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5%', paddingTop: '0.5%' }}>

            {/* Status */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ backgroundColor: ORANGE, display: 'inline-block', padding: '6px 14px' }}>
                <span style={{ fontFamily: "'Jersey 10', sans-serif", fontSize: 'clamp(12px, 1.8vw, 32px)', letterSpacing: '0.17em', color: '#000' }}>
                  status:
                </span>
              </div>
              <FractalBox>
                <p style={{ ...TEXT_STYLE }}>
                  {owner.status || '—'}
                </p>
              </FractalBox>
            </div>

            {/* Interests */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ backgroundColor: ORANGE, display: 'inline-block', padding: '6px 14px' }}>
                <span style={{ fontFamily: "'Jersey 10', sans-serif", fontSize: 'clamp(12px, 1.8vw, 32px)', letterSpacing: '0.17em', color: '#000' }}>
                  interests:
                </span>
              </div>
              <FractalBox>
                {Array.isArray(owner.interests) && owner.interests.length > 0 ? (
                  <ul style={{ ...TEXT_STYLE, paddingLeft: '1.5em' }}>
                    {owner.interests.map((interest, i) => (
                      <li key={i}>{interest}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ ...TEXT_STYLE, color: '#999', fontStyle: 'italic' }}>
                    nothing listed yet
                  </p>
                )}
              </FractalBox>
            </div>

          </div>
        </div>

        {/* Card glass inset sheen */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none', boxShadow: GLASS_INSET }} />
      </div>

      {/* ── QR code ── */}
      <div
        style={{
          position: 'absolute',
          top: '78%',
          right: '5%',
          transform: 'translateY(-50%) rotate(-7.207deg)',
          borderRadius: 46,
          background: 'rgba(228, 5, 172, 0.93)',
          boxShadow: QR_BOX_SHADOW,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '17.763px 26.955px 18.981px 26.984px',
          boxSizing: 'border-box',
        }}
      >
        <img
          src={registerQr}
          alt="Register QR code"
          style={{ width: '13vw', objectFit: 'contain', display: 'block' }}
        />
      </div>

    </div>
  );
};