/**
 * The full kiosk app, opened directly at each state machine state.
 * Move the mouse to drive the hand cursor; hold the button to pinch/click.
 */

import type { Story, StoryDefault } from '@ladle/react';
import AppContainer from '@/AppContainer';
import { AppState } from '@/core/state-machine';

export default { title: 'Kiosk / App', meta: { auth: 'kiosk', cv: true } } satisfies StoryDefault;

export const Idle: Story = () => <AppContainer />;

export const Hub: Story = () => <AppContainer initialState={AppState.HUB} />;

export const Discovery: Story = () => <AppContainer initialState={AppState.DISCOVERY} />;

export const Games: Story = () => <AppContainer initialState={AppState.GAMES} />;

export const Auth: Story = () => <AppContainer initialState={AppState.AUTH} />;

export const Onboarding: Story = () => <AppContainer initialState={AppState.ONBOARDING} />;

export const CameraDenied: Story = () => <AppContainer initialState={AppState.DISCOVERY} />;
CameraDenied.meta = { camera: 'denied', allowConsoleErrors: true };
