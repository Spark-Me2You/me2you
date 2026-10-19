/**
 * DrawIt: draw the word of the day with the hand cursor. Hold the mouse
 * button to pinch-paint.
 */

import { useState } from 'react';
import { action, type Story, type StoryDefault } from '@ladle/react';
import { AppState } from '@/core/state-machine';
import type { BrushSize, Tool } from '@/features/games/drawit/types/drawit';
import { DrawItGame } from '@/features/games/drawit/components/DrawItGame';
import { DrawItMenu } from '@/features/games/drawit/components/DrawItMenu';
import { DailyPromptScreen } from '@/features/games/drawit/components/DailyPromptScreen';
import { Countdown } from '@/features/games/drawit/components/Countdown';
import { DrawingCanvas } from '@/features/games/drawit/components/DrawingCanvas';
import { Timer } from '@/features/games/drawit/components/Timer';
import { Toolbox } from '@/features/games/drawit/components/Toolbox';
import { ReviewScreen } from '@/features/games/drawit/components/ReviewScreen';
import { ThanksScreen } from '@/features/games/drawit/components/ThanksScreen';
import { Gallery } from '@/features/games/drawit/components/Gallery';
import { ConfirmModal } from '@/features/games/drawit/components/ConfirmModal';
import { KioskProviders } from '../_support/KioskProviders';
import { placeholderImageUrl } from '../_support/fixtures/images';

export default { title: 'Kiosk / DrawIt', meta: { auth: 'kiosk', cv: true } } satisfies StoryDefault;

/** The whole game, starting at the menu. */
export const Game: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <DrawItGame onExit={action('exit')} />
  </KioskProviders>
);

export const Menu: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <DrawItMenu onStart={action('start')} onGallery={action('gallery')} onBack={action('back')} />
  </KioskProviders>
);

export const DailyPrompt: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <DailyPromptScreen onProceed={action('proceed')} onBack={action('back')} />
  </KioskProviders>
);

export const CountdownScreen: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <Countdown onDone={action('done')} />
  </KioskProviders>
);

export const Canvas: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <DrawingCanvas word="cat" onSubmit={(dataUrl) => action('submit')(dataUrl.length)} onQuit={action('quit')} />
  </KioskProviders>
);

export const TimerOnly: Story = () => (
  <div className="relative h-40 bg-[#58e7f7] p-6">
    <Timer onExpire={action('expire')} />
  </div>
);
TimerOnly.meta = { cv: false };

export const Tools: Story = () => {
  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState('#e44805');
  const [brushSize, setBrushSize] = useState<BrushSize>('medium');
  return (
    <div className="relative h-screen bg-[#58e7f7]">
      <Toolbox
        tool={tool}
        color={color}
        brushSize={brushSize}
        onTool={setTool}
        onColor={setColor}
        onBrush={setBrushSize}
        onClear={action('clear')}
        onUndo={action('undo')}
        onRedo={action('redo')}
        canUndo
        canRedo={false}
      />
    </div>
  );
};
Tools.meta = { cv: false };

/** Review uploads the drawing and shows a claim QR for it. */
export const Review: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <ReviewScreen
      imageDataUrl={placeholderImageUrl('kiosk/drawing.png')}
      word="cat"
      onClaimed={action('claimed')}
      onDiscard={action('discard')}
      onContinue={action('continue')}
    />
  </KioskProviders>
);

export const Thanks: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <ThanksScreen onDone={action('done')} autoDismissMs={0} />
  </KioskProviders>
);

export const GalleryScreen: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <Gallery onBack={action('back')} />
  </KioskProviders>
);

export const GalleryEmpty: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <Gallery onBack={action('back')} />
  </KioskProviders>
);
GalleryEmpty.meta = { seed: 'empty' };

export const QuitConfirm: Story = () => (
  <KioskProviders state={AppState.GAMES}>
    <ConfirmModal message="Quit drawing? Your picture won't be saved." onYes={action('yes')} onNo={action('no')} />
  </KioskProviders>
);
