/**
 * Hub View Network — "Network" screen (ARCHIVED)
 * Original user card grid implementation - preserved for potential future use
 * Currently replaced by PixiHub in HubView.tsx
 * 
 * To restore: Replace HubView.tsx content with this file and update imports
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/core/auth';
import { useAppState } from '@/core/state-machine';
import { AppState } from '@/core/state-machine/appStateMachine';
import { hubService, type HubUserData } from './services/hubService';
import { ProfileCard } from './components/ProfileCard';
import { ProfileCardView } from '@/features/discovery/components/ProfileCardView';
import type { RandomImageData } from '@/features/discovery/types/image';
import me2youLogo from '@/assets/me2you.png';

/** Minimum visible card slots (5 cols × 2 rows) — fill the rest with anon cards */
const MIN_SLOTS = 10;

function toRandomImageData(hubUser: HubUserData, orgId: string): RandomImageData {
  return {
    image: {
      id: '',
      owner_id: hubUser.user.id,
      org_id: orgId,
      storage_path: '',
      category: 'profile',
      is_public: true,
      created_at: hubUser.user.created_at,
    },
    owner: {
      id: hubUser.user.id,
      name: hubUser.user.name,
      status: hubUser.user.status,
      pronouns: hubUser.user.pronouns,
      major: hubUser.user.major,
      interests: hubUser.user.interests,
      org_id: orgId,
      created_at: hubUser.user.created_at,
    },
    imageUrl: hubUser.profileImageUrl || '',
  };
}

export const HubViewNetwork: React.FC = () => {
  const { transitionTo } = useAppState();
  const { kioskOrgId } = useAuth();

  const [users, setUsers] = useState<HubUserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<HubUserData | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!kioskOrgId) {
        setError('No organization ID available');
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const fetchedUsers = await hubService.getAllOrgUsers(kioskOrgId);
        setUsers(fetchedUsers);
        setError(null);
      } catch (err) {
        console.error('[HubView] Failed to fetch users:', err);
        setError(
          err instanceof Error ? err.message : 'An unexpected error occurred while loading users',
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [kioskOrgId]);

  const handleBack = () => transitionTo(AppState.IDLE);

  // Build the grid item list: real users first, then anon fillers up to MIN_SLOTS
  const anonCount = Math.max(0, MIN_SLOTS - users.length);
  const gridItems: Array<HubUserData | null> = [
    ...users,
    ...Array(anonCount).fill(null),
  ];

  // ── Profile detail — replaces hub entirely so nothing overlaps ───────────────
  if (selectedUser) {
    return (
      <ProfileCardView
        profileData={toRandomImageData(selectedUser, kioskOrgId || '')}
        onBack={() => setSelectedUser(null)}
        backLabel="back to network"
        onHome={handleBack}
      />
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={styles.screen}>
        <img src={me2youLogo} alt="me2you" style={styles.logo} />
        <div style={styles.centerMessage}>
          <p style={styles.messageText}>Loading community members…</p>
        </div>
        <button onClick={handleBack} style={styles.exitButton}>exit</button>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={styles.screen}>
        <img src={me2youLogo} alt="me2you" style={styles.logo} />
        <div style={styles.centerMessage}>
          <p style={{ ...styles.messageText, color: '#ffaacc' }}>
            Failed to load community members
          </p>
          <p style={{ ...styles.messageText, fontSize: '1rem', marginTop: '0.5rem' }}>{error}</p>
        </div>
        <button onClick={handleBack} style={styles.exitButton}>exit</button>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.screen}>
      {/* me2you logo */}
      <img src={me2youLogo} alt="me2you" style={styles.logo} />

      {/* "network" purple glass label — top right */}
      <div style={styles.networkLabel}>
        <p style={styles.networkText}>network</p>
        <div style={styles.networkInsetShadow} />
      </div>

      {/* Purple glass scrollable container */}
      <div style={styles.scrollContainer}>
        {/* 5-column user card grid */}
        <div style={styles.grid}>
          {gridItems.map((item, i) => (
            <ProfileCard
              key={item ? item.user.id : `anon-${i}`}
              userData={item}
              colorIndex={i}
              onClick={item ? () => setSelectedUser(item) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Exit button */}
      <button onClick={handleBack} style={styles.exitButton}>
        exit
      </button>

    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  screen: {
    position: 'fixed' as const,
    inset: 0,
    overflow: 'hidden',
  },

  logo: {
    position: 'absolute' as const,
    top: '20px',
    left: '60px',
    width: '52%',
    maxWidth: '700px',
    transform: 'rotate(3.41deg)',
    transformOrigin: 'left top',
    zIndex: 4,
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
  },

  networkLabel: {
    position: 'absolute' as const,
    top: '8%',
    right: '2%',
    backgroundColor: 'rgba(113, 5, 228, 0.93)',
    borderRadius: 10,
    padding: '4px 24px 4px 24px',
    zIndex: 3,
    overflow: 'hidden' as const,
  },

  networkText: {
    fontFamily: "'Averia Libre', sans-serif",
    fontSize: 'clamp(28px, 4vw, 64px)',
    color: '#fff',
    letterSpacing: '10.88px',
    margin: 0,
    position: 'relative' as const,
    zIndex: 1,
  },

  networkInsetShadow: {
    position: 'absolute' as const,
    inset: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none' as const,
    boxShadow:
      'inset 0px 0px 4px 0px rgba(0,0,0,0.25), inset 1px 1px 49.9px 14px rgba(255,255,255,0.2)',
  },

  scrollContainer: {
    position: 'absolute' as const,
    top: '24%',
    left: '6%',
    right: '16%',
    bottom: '2%',
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    borderRadius: 46,
    backgroundColor: 'rgba(113, 5, 228, 0.57)',
    boxShadow:
      'inset 0px 0px 4px 0px rgba(0,0,0,0.25), inset 1px 1px 49.9px 14px rgba(255,255,255,0.2)',
    zIndex: 2,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '3.5vh 2.5vw',
    padding: '4.5vh 3vw 5vh',
  },

  exitButton: {
    position: 'fixed' as const,
    bottom: '3%',
    right: '4%',
    backgroundColor: '#7105e4',
    color: '#fff',
    border: 'none',
    padding: '14px 28px',
    fontFamily: "'Jersey 10', sans-serif",
    fontSize: 'clamp(16px, 1.8vw, 28px)',
    letterSpacing: '5px',
    cursor: 'pointer',
    borderRadius: 6,
    zIndex: 10,
  },

  centerMessage: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },

  messageText: {
    fontFamily: "'Averia Libre', sans-serif",
    fontSize: '1.5rem',
    color: '#fff',
    margin: 0,
  },
} as const;