/**
 * Mobile user pages, rendered through the real router and route guards.
 */

import type { Story, StoryDefault } from '@ladle/react';
import App from '@/App';
import { Scenario } from '../_support/StoryEnvironment';
import { ME_ID } from '../_support/fixtures/data';

export default { title: 'Mobile / User Pages' } satisfies StoryDefault;

export const LandingSignedOut: Story = () => <App />;
LandingSignedOut.meta = { route: '/user' };

export const LandingSignedIn: Story = () => <App />;
LandingSignedIn.meta = { route: '/user', auth: 'user' };

export const Profile: Story = () => <App />;
Profile.meta = { route: '/user/profile', auth: 'user' };

export const ProfileLoading: Story = () => <App />;
ProfileLoading.meta = { route: '/user/profile', auth: 'user', delay: 'forever' };

export const ProfileLoadFailed: Story = () => <App />;
ProfileLoadFailed.meta = { route: '/user/profile', auth: 'user', fail: ['user'], allowConsoleErrors: true };

export const ProfileNoPhotos: Story = () => (
  <Scenario
    tables={(t) => {
      t.gesture_image = t.gesture_image.filter((row) => row.owner_id !== ME_ID);
      t.cropped_image = t.cropped_image.filter((row) => row.owner_id !== ME_ID);
    }}
  >
    <App />
  </Scenario>
);
ProfileNoPhotos.meta = { route: '/user/profile', auth: 'user' };

export const Gallery: Story = () => <App />;
Gallery.meta = { route: '/user/gallery', auth: 'user' };

export const GalleryEmpty: Story = () => <App />;
GalleryEmpty.meta = { route: '/user/gallery', auth: 'user-new' };

export const GameScores: Story = () => <App />;
GameScores.meta = { route: '/user/game-scores', auth: 'user' };

export const GameScoresEmpty: Story = () => <App />;
GameScoresEmpty.meta = { route: '/user/game-scores', auth: 'user-new' };

export const CustomizeAvatar: Story = () => <App />;
CustomizeAvatar.meta = { route: '/user/customize', auth: 'user' };

export const Messages: Story = () => <App />;
Messages.meta = { route: '/user/messages', auth: 'user' };

export const MessagesEmpty: Story = () => <App />;
MessagesEmpty.meta = { route: '/user/messages', auth: 'user-new' };

export const GuardRedirectsWhenSignedOut: Story = () => <App />;
GuardRedirectsWhenSignedOut.meta = { route: '/user/profile' };
