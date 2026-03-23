/**
 * Profile Card Component
 * Displays a user card (or anon placeholder) in the Hub Network grid.
 * Matches the Figma "Network" screen card design.
 */

import React from 'react';
import type { HubUserData } from '../services/hubService';

const FRAME_COLORS = ['#e405ac', '#d3e405', '#58e7f7'] as const;

/** Person silhouette for anon cards — two ellipses matching the Figma anon-user components */
const PersonSilhouette: React.FC = () => (
  <svg
    viewBox="0 0 100 120"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '78%', height: '78%', position: 'absolute', bottom: '-8%', left: '11%' }}
  >
    {/* Head */}
    <circle cx="50" cy="38" r="23" fill="rgba(255,255,255,0.78)" />
    {/* Body — partially clipped by card overflow:hidden */}
    <ellipse cx="50" cy="114" rx="40" ry="28" fill="rgba(255,255,255,0.78)" />
  </svg>
);

export interface ProfileCardProps {
  /** null = anon placeholder */
  userData: HubUserData | null;
  colorIndex: number;
  onClick?: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ userData, colorIndex, onClick }) => {
  const [imgError, setImgError] = React.useState(false);

  const isAnon = userData === null;
  const color = FRAME_COLORS[colorIndex % FRAME_COLORS.length];
  const profileImageUrl = userData?.profileImageUrl ?? null;
  const showPhoto = !isAnon && !!profileImageUrl && !imgError;
  const name = userData?.user.name ?? '';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Outer colored frame */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          backgroundColor: color,
          borderRadius: 20,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: isAnon ? 0 : '6%',
          boxSizing: 'border-box',
        }}
      >
        {isAnon ? (
          <PersonSilhouette />
        ) : (
          /* White inner photo rectangle */
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#fff',
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow:
                'inset -1px -1px 4px 0px rgba(0,0,0,0.25), inset 0px 4px 4px 0px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showPhoto && (
              <img
                src={profileImageUrl!}
                alt={name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setImgError(true)}
              />
            )}
          </div>
        )}
      </div>

      {/* Name label strip */}
      <div
        style={{
          width: '90%',
          height: 44,
          backgroundColor: 'rgba(255, 245, 245, 0.38)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {name && (
          <span
            style={{
              fontFamily: "'Jersey 10', sans-serif",
              fontSize: 'clamp(11px, 1.3vw, 20px)',
              color: '#fff',
              textAlign: 'center',
              padding: '0 8px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              letterSpacing: '1px',
            }}
          >
            {name}
          </span>
        )}
      </div>
    </div>
  );
};
