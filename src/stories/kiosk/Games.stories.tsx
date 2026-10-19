/**
 * Kiosk games. FlapFlap is played by flapping: press F (left player) or
 * J (right player); P toggles a second player for 2P. DrawIt paints while
 * the mouse button (pinch) is held.
 */

import { action, type Story, type StoryDefault } from '@ladle/react';
import { AppState } from '@/core/state-machine';
import { GamesView } from '@/features/games/components/GamesView';
import { GamesHub } from '@/features/games/components/GamesHub';
import { FlapFlapLauncher } from '@/features/games/components/FlapFlapLauncher';
import { CameraOverlay } from '@/features/games/components/CameraOverlay';
import { FlapFlapGame } from '@/features/games/flapflap/components/FlapFlapGame';
import { FlapFlapLeaderboard } from '@/features/games/flapflap/components/FlapFlapLeaderboard';
import { GameOverClaim } from '@/features/games/flapflap/components/GameOverClaim';
import { FlapFlap2PGame } from '@/features/games/flapflap2p/components/FlapFlap2PGame';
import { SplitCameraPanel } from '@/features/games/flapflap2p/components/SplitCameraPanel';
import { KioskProviders } from '../_support/KioskProviders';
import { sampleLeaderboard } from '../_support/fixtures/samples';

export default { title: 'Kiosk / Games', meta: { auth: 'kiosk', cv: true } } satisfies StoryDefault;

export const Hub: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <GamesHub onSelectGame={action('selectGame')} />
  </KioskProviders>
);

/** Hub plus game switching, as in the app. */
export const View: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <GamesView />
  </KioskProviders>
);

export const FlapFlapModeSelect: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <FlapFlapLauncher onExit={action('exit')} />
  </KioskProviders>
);

export const FlapFlapSolo: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <FlapFlapGame onExit={action('exit')} onScoreChange={action('score')} />
  </KioskProviders>
);

export const FlapFlapTwoPlayer: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <FlapFlap2PGame onExit={action('exit')} />
  </KioskProviders>
);
FlapFlapTwoPlayer.meta = { players: 2 };

export const FlapFlapNoCamera: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <FlapFlapGame onExit={action('exit')} />
  </KioskProviders>
);
FlapFlapNoCamera.meta = { camera: 'denied', allowConsoleErrors: true };

const TEAL = 'flex min-h-screen items-center justify-center bg-[#008080] p-10';

export const Leaderboard: Story = () => (
  <div className={TEAL}>
    <FlapFlapLeaderboard entries={sampleLeaderboard} isLoading={false} error={null} currentScore={31} />
  </div>
);

export const LeaderboardLoading: Story = () => (
  <div className={TEAL}>
    <FlapFlapLeaderboard entries={[]} isLoading error={null} />
  </div>
);

export const LeaderboardEmpty: Story = () => (
  <div className={TEAL}>
    <FlapFlapLeaderboard entries={[]} isLoading={false} error={null} title="today's best" />
  </div>
);

export const LeaderboardError: Story = () => (
  <div className={TEAL}>
    <FlapFlapLeaderboard entries={[]} isLoading={false} error="Couldn't load scores" />
  </div>
);

/** Game-over screen with a live claim QR for the score. */
export const GameOver: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <GameOverClaim
      score={27}
      onPlayAgain={action('playAgain')}
      leaderboardEntries={sampleLeaderboard}
      isLeaderboardLoading={false}
      leaderboardError={null}
      onScoreClaimed={action('scoreClaimed')}
    />
  </KioskProviders>
);

export const SplitCamera: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <SplitCameraPanel present={{ P1: true, P2: true }} ready={{ P1: true, P2: false }} showReady />
  </KioskProviders>
);
SplitCamera.meta = { players: 2 };

export const GameCamera: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <CameraOverlay onVideoReady={action('videoReady')} />
  </KioskProviders>
);
