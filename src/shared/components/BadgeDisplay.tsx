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

// Layout varies with badge count so a few badges don't look lonely.
function layoutFor(count: number) {
  if (count === 1) return { cols: 'grid-cols-[1fr]', maxW: 'max-w-[180px]' };
  if (count === 2) return { cols: 'grid-cols-[repeat(2,1fr)]', maxW: 'max-w-[140px]' };
  if (count === 3) return { cols: 'grid-cols-[repeat(3,1fr)]', maxW: 'max-w-[110px]' };
  return { cols: 'grid-cols-[repeat(3,1fr)]', maxW: 'max-w-[90px]' };
}

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

  const { cols, maxW } = layoutFor(badges.length);

  return (
    <div className={`m-0 grid w-full items-center justify-items-center gap-3 ${cols}`}>
      {badges.map((badgeId) => {
        const title = badgeTitle(badgeId);
        const isHovered = hovered === badgeId;
        return (
          <span
            key={badgeId}
            className="group relative inline-flex w-full items-center justify-center"
            tabIndex={0}
            onMouseEnter={() => onEnter(badgeId)}
            onMouseLeave={() => onLeave(badgeId)}
            onFocus={() => onEnter(badgeId)}
            onBlur={() => onLeave(badgeId)}
          >
            <img
              src={`/badges/${badgeId}.PNG`}
              alt={title}
              className={`block h-auto w-full object-contain transition-transform duration-120 ease-[ease] group-hover:scale-[1.06] ${maxW}`}
            />
            <span
              className={`pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-5 -translate-x-1/2 rounded-md bg-[#1a1a1a] px-2.5 py-1 font-averia text-[13px] tracking-[0.6px] whitespace-nowrap text-white shadow-[0_2px_6px_rgba(0,0,0,0.3)] transition-opacity duration-120 ease-[ease] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[5px] after:border-solid after:border-t-[#1a1a1a] after:border-r-transparent after:border-b-transparent after:border-l-transparent after:content-[''] ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            >
              {title}
            </span>
          </span>
        );
      })}
    </div>
  );
};
