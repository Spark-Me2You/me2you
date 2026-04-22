/**
 * Badge Service
 * Determines which badges a user has earned based on account age and game scores
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/features/discovery/types/image';

export type BadgeId = 'new_test' | '1week_test' | '1month_test' | 'firstplace_test';

/**
 * Get all badges earned by a user
 * @param userProfile - User profile with created_at timestamp
 * @param supabase - Supabase client instance
 * @returns Array of earned badge IDs
 */
export const getEarnedBadges = async (
  userProfile: UserProfile,
  supabase: SupabaseClient,
): Promise<BadgeId[]> => {
  if (!userProfile) {
    return [];
  }

  const badges: BadgeId[] = [];

  // Check account age badges
  const createdAt = new Date(userProfile.created_at);
  const now = new Date();
  const ageInMs = now.getTime() - createdAt.getTime();
  const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

  // New account badge - less than 1 week
  if (ageInDays < 7) {
    badges.push('new_test');
  }

  // 1 week account badge - at least 1 week old
  if (ageInDays >= 7) {
    badges.push('1week_test');
  }

  // 1 month account badge - at least 30 days old
  if (ageInDays >= 30) {
    badges.push('1month_test');
  }

  // Check if user is #1 on leaderboard
  try {
    const { data: topScore, error } = await supabase
      .from('game_score')
      .select('owner_id')
      .eq('org_id', userProfile.org_id)
      .order('score', { ascending: false })
      .limit(1)
      .single();

    if (!error && topScore && topScore.owner_id === userProfile.id) {
      badges.push('firstplace_test');
    }
  } catch (err) {
    console.warn('[badgeService] Failed to check leaderboard status:', err);
  }

  return badges;
};
