/**
 * Small status components: spinner, error banner, character counter, badges.
 */

import { action, type Story, type StoryDefault } from '@ladle/react';
import { CharacterCounter, ErrorMessage, LoadingSpinner } from '@/shared/components';
import { BadgeDisplay } from '@/shared/components/BadgeDisplay';
import { ME_ID, ORG_ID } from '../_support/fixtures/data';

export default { title: 'Shared / Feedback' } satisfies StoryDefault;

export const Spinners: Story = () => (
  <div className="flex items-center gap-8 p-6">
    <LoadingSpinner size="small" />
    <LoadingSpinner size="medium" />
    <LoadingSpinner size="large" />
  </div>
);

export const ErrorBanner: Story = () => (
  <div className="max-w-md p-6">
    <ErrorMessage message="Couldn't save your profile. Check your connection and try again." />
  </div>
);

export const DismissibleError: Story = () => (
  <div className="max-w-md p-6">
    <ErrorMessage message="Photo upload failed." onDismiss={action('dismiss')} />
  </div>
);

export const Counter: Story = () => (
  <div className="flex flex-col gap-3 p-6">
    <CharacterCounter current={12} max={100} />
    <CharacterCounter current={92} max={100} />
    <CharacterCounter current={100} max={100} />
  </div>
);

export const BadgesGiven: Story = () => (
  <div className="p-6">
    <BadgeDisplay badges={['new_test', '1week_test', '1month_test', 'firstplace_test']} />
  </div>
);

/** Badges computed from the signed-in user's account age and leaderboard rank. */
export const BadgesComputed: Story = () => (
  <div className="p-6">
    <BadgeDisplay userId={ME_ID} userCreatedAt="2026-08-01T12:00:00.000Z" orgId={ORG_ID} />
  </div>
);
BadgesComputed.meta = { auth: 'user' };
