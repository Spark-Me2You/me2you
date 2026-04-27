/**
 * Badge Display Component
 * Renders a collection of badges in a flex row with wrapping
 * Can either display pre-computed badges or fetch them from user data
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/core/supabase/client';
import { getEarnedBadges, type BadgeId } from '@/core/badges/badgeService';

const BADGE_TITLES: Record<string, string> = {
  new_test: 'newcomer',
  '1week_test': '1 week strong',
  '1month_test': '1 month strong',
  firstplace_test: 'first place!',
};

function badgeTitle(id: string) {
  return BADGE_TITLES[id] ?? id.replace(/_/g, ' ');
}
import type { UserProfile } from '@/features/discovery/types/image';
import styles from './BadgeDisplay.module.css';

interface BadgeDisplayProps {
  /** Array of badge IDs to display (pre-computed) */
  badges?: BadgeId[];
  /** User ID for badge computation */
  userId?: string;
  /** User creation timestamp for age-based badges */
  userCreatedAt?: string;
  /** Organization ID for leaderboard check */
  orgId?: string;
}

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  badges: precomputedBadges,
  userId,
  userCreatedAt,
  orgId,
}) => {
  const [badges, setBadges] = useState<BadgeId[]>(precomputedBadges ?? []);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch badges if user data is provided instead of pre-computed badges
  useEffect(() => {
    if (precomputedBadges) {
      // Use pre-computed badges
      setBadges(precomputedBadges);
      return;
    }

    if (!userId || !userCreatedAt || !orgId) {
      // Not enough data to compute badges
      setBadges([]);
      return;
    }

    const fetchBadges = async () => {
      try {
        setIsLoading(true);
        const userProfile: Partial<UserProfile> & { org_id: string } = {
          id: userId,
          org_id: orgId,
          name: '', // Not needed for badge computation
          status: null,
          pronouns: null,
          major: null,
          interests: null,
          created_at: userCreatedAt,
        };

        const earnedBadges = await getEarnedBadges(userProfile as UserProfile, supabase);
        setBadges(earnedBadges);
      } catch (err) {
        console.warn('[BadgeDisplay] Failed to fetch badges:', err);
        setBadges([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBadges();
  }, [precomputedBadges, userId, userCreatedAt, orgId]);

  if (isLoading || !badges || badges.length === 0) {
    return null;
  }

  return (
    <BadgeGrid badges={badges} />
  );
};

// Internal: handles hover state with React so the CV cursor's synthetic
// mouseenter/mouseleave events trigger tooltip visibility (native CSS :hover
// does not respond to dispatched MouseEvents).
const BadgeGrid: React.FC<{ badges: BadgeId[] }> = ({ badges }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const onEnter = useCallback((id: string) => setHovered(id), []);
  const onLeave = useCallback(
    (id: string) => setHovered((prev) => (prev === id ? null : prev)),
    [],
  );

  return (
    <div className={styles.badgeContainer} data-count={badges.length}>
      {badges.map((badgeId) => {
        const title = badgeTitle(badgeId);
        const isHovered = hovered === badgeId;
        return (
          <span
            key={badgeId}
            className={styles.badgeWrap}
            tabIndex={0}
            onMouseEnter={() => onEnter(badgeId)}
            onMouseLeave={() => onLeave(badgeId)}
            onFocus={() => onEnter(badgeId)}
            onBlur={() => onLeave(badgeId)}
          >
            <img
              src={`/badges/${badgeId}.PNG`}
              alt={title}
              className={styles.badge}
            />
            <span
              className={styles.tooltip}
              style={{ opacity: isHovered ? 1 : 0 }}
            >
              {title}
            </span>
          </span>
        );
      })}
    </div>
  );
};
