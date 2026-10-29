/**
 * Profile Card View
 * Full-screen expanded profile view — matches Figma "other profile (NOT LOGGED IN)" (node 538:564).
 * Used by both Discovery and Hub when a user card is tapped.
 */

import React from 'react';
import type { RandomImageData } from '../types/image';
import { BadgeDisplay } from '@/shared/components/BadgeDisplay';
import { SendMessageButton } from '@/features/messages';
import { RegistrationQRDisplay } from '@/features/kiosk';
import { ExitButton } from '@/shared/components';
import me2youLogo from '@/assets/me2you.png';
import otterHandImage from '@/assets/hand.png';
import arrow2 from '@/assets/arrow2.svg';

/** Orange label chip: "status:", "interests:", pronouns, major. */
const LABEL = 'bg-orange py-[6px] pl-[14px]';
const LABEL_TEXT = 'font-jersey text-[clamp(12px,1.8vw,32px)] tracking-brand text-ink';
const TAPE = 'pointer-events-none absolute z-3 h-[10px] w-[42px] rotate-[146.367deg] bg-tape-alt/68';
/** User-typed text. Wraps inside its box. */
const TYPED =
  'm-0 text-left font-mono font-normal tracking-[-0.72px] text-ink [word-break:break-word] break-words whitespace-normal';

interface ProfileCardViewProps {
  profileData: RandomImageData;
  onBack: () => void;
  backLabel?: string;
  onHome?: () => void;
}

const FractalBox: React.FC<{ children: React.ReactNode; maxHeight?: number | string }> = ({ children, maxHeight }) => (
  // overflow stays visible so the tape (positioned at -5/-10) isn't clipped.
  <div className="relative box-border min-h-[90px] w-full max-w-full overflow-visible" style={{ maxHeight }}>
    <div className={`${TAPE} -top-[5px] -left-[10px]`} />
    <div className={`${TAPE} -right-[10px] -bottom-[5px]`} />

    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
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
    <div className={`relative z-1 box-border max-w-full overflow-auto px-[14px] py-[10px] ${maxHeight ? 'max-h-full' : ''}`}>
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
      <div className="fixed inset-0 flex items-center justify-center">
        <p className="font-averia text-[2rem] text-white">Profile missing</p>
      </div>
    );
  }

  const { owner, imageUrl } = profileData;

  return (
    <div className="fixed inset-0 overflow-hidden">
      <ExitButton onClick={onBack} />

      {/* ── Main frosted glass card ── */}
      <div className="absolute top-[14%] right-[26%] bottom-[8%] left-[4%] overflow-hidden rounded-glass bg-glass shadow-drop">
        <div className="absolute inset-0 flex gap-[3%] py-[5%] pr-[4%] pl-[8%]">

          {/* ── Left column ── */}
          <div className="flex min-h-0 flex-[0_0_32%] flex-col gap-[2.5%] overflow-hidden">
            <div className="min-h-0 w-full flex-[0_0_57%] overflow-hidden rounded-[74px] bg-white shadow-well">
              <img
                src={imageUrl}
                alt={`${owner.name}'s profile`}
                className="h-full w-full object-cover"
                onError={(e) => { e.currentTarget.src = me2youLogo; }}
              />
            </div>

            <p className="m-0 shrink-0 font-jersey text-[clamp(24px,4.5vw,128px)] leading-none tracking-brand text-ink">
              {owner.name}
            </p>

            {owner.pronouns && (
              <div className={`${LABEL} mt-[2%] shrink-0 self-start pr-12`}>
                <span className={LABEL_TEXT}>{owner.pronouns}</span>
              </div>
            )}

            {owner.major && (
              <div className={`${LABEL} shrink-0 self-start pr-12`}>
                <span className={LABEL_TEXT}>{owner.major}</span>
              </div>
            )}
          </div>

          {/* ── Right column ── */}
          <div className="flex min-w-0 flex-1 flex-col gap-[4%] pt-[0.5%]">

            {/* Status */}
            <div className="flex w-full flex-col items-start gap-[10px]">
              <div className={`${LABEL} inline-block pr-[14px]`}>
                <span className={LABEL_TEXT}>status:</span>
              </div>
              <FractalBox>
                <p className={`${TYPED} text-body-md leading-normal`}>
                  {owner.status || '—'}
                </p>
              </FractalBox>
            </div>

            {/* Interests */}
            <div className="flex w-full flex-col items-start gap-[10px]">
              <div className={`${LABEL} inline-block pr-[14px]`}>
                <span className={LABEL_TEXT}>interests:</span>
              </div>
              <FractalBox maxHeight={140}>
                {Array.isArray(owner.interests) && owner.interests.length > 0 ? (
                  <ul className={`${TYPED} pl-[1.4em] text-[14px] leading-[1.25]`}>
                    {owner.interests.map((interest, i) => (
                      <li key={i}>{interest}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={`${TYPED} text-[14px] leading-normal italic text-ink-muted`}>
                    nothing listed yet
                  </p>
                )}
              </FractalBox>
            </div>

            {/* Bottom row: badges (left half) + envelope (right half).
                `flex-1` lets it claim the remaining vertical space below
                interests so badges/envelope can center between the two edges. */}
            <div className="mt-[2%] flex w-full min-w-0 flex-1 items-center gap-[4%]">
              <div className="flex min-w-0 flex-1 items-center justify-center">
                <BadgeDisplay
                  userId={owner.id}
                  userCreatedAt={owner.created_at}
                  orgId={owner.org_id}
                />
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-center">
                <SendMessageButton recipientId={owner.id} recipientName={owner.name} />
              </div>
            </div>

          </div>
        </div>

        {/* Card glass inset sheen */}
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-glass-inset" />
      </div>

      {/* ── QR code ── */}
      <div className="absolute top-[77%] right-[5%] box-border flex items-center justify-center rounded-glass bg-magenta/93 px-[27px] py-[18px] shadow-glass-card [transform:translateY(-50%)_rotate(-7.207deg)_scale(0.88)]">
        <RegistrationQRDisplay size={220} />
      </div>

      {/* ── QR label text ── */}
      <p className="pointer-events-none absolute top-[45%] right-[3%] z-10 m-0 w-[14vw] text-center font-averia text-[clamp(12px,1.6vw,28px)] leading-[1.1] tracking-brand text-ink [transform:rotate(5.04deg)]">
        scan here to create and edit your profile!
      </p>

      {/* ── QR arrow ── */}
      <img
        src={arrow2}
        alt=""
        className="pointer-events-none absolute top-[58%] right-[4%] z-10 h-4 w-[34px] [transform:rotate(101.44deg)]"
      />

      {/* ── Otter hand ── */}
      <img
        src={otterHandImage}
        alt=""
        className="pointer-events-none absolute top-[84%] right-[11%] w-[16vw] object-contain"
      />

    </div>
  );
};
