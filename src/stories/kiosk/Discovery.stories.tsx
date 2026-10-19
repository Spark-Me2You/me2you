/**
 * Discovery: hold a pose (keys 1 / 2 / 3 for peace, wave, thumbs up) to reveal
 * someone who uploaded the same pose. Hold it until the border fills to open
 * their profile card.
 */

import { useEffect, useState } from 'react';
import { action, type Story, type StoryDefault } from '@ladle/react';
import { AppState } from '@/core/state-machine';
import { DiscoveryView } from '@/features/discovery/components/DiscoveryView';
import { CameraView } from '@/features/discovery/components/CameraView';
import { ProfileCardView } from '@/features/discovery/components/ProfileCardView';
import { RandomImageCard } from '@/features/discovery/components/RandomImageCard';
import { BorderProgress } from '@/features/discovery/components/BorderProgress';
import { CooldownIndicator } from '@/features/discovery/components/CooldownIndicator';
import { HelpPopup } from '@/features/discovery/components/HelpPopup';
import { NextButton } from '@/features/discovery/components/NextButton';
import { KioskProviders } from '../_support/KioskProviders';
import { Scenario } from '../_support/StoryEnvironment';
import { sampleRandomImage } from '../_support/fixtures/samples';

export default { title: 'Kiosk / Discovery', meta: { auth: 'kiosk', cv: true } } satisfies StoryDefault;

export const Waiting: Story = () => (
  <KioskProviders state={AppState.DISCOVERY}>
    <DiscoveryView />
  </KioskProviders>
);

export const HoldingPeaceSign: Story = () => (
  <KioskProviders state={AppState.DISCOVERY}>
    <DiscoveryView />
  </KioskProviders>
);
HoldingPeaceSign.meta = { gesture: 'Victory' };

/** Nobody in the org has uploaded this pose. */
export const NoMatches: Story = () => (
  <Scenario
    tables={(t) => {
      t.gesture_image = t.gesture_image.filter((row) => row.category !== 'thumbs_up');
    }}
  >
    <KioskProviders state={AppState.DISCOVERY}>
      <DiscoveryView />
    </KioskProviders>
  </Scenario>
);
NoMatches.meta = { gesture: 'Thumb_Up' };

export const Camera: Story = () => (
  <KioskProviders state={AppState.DISCOVERY}>
    <CameraView onGestureDetected={action('gesture')} />
  </KioskProviders>
);
Camera.meta = { gesture: 'Open_Palm' };

export const ProfileCard: Story = () => (
  <KioskProviders state={AppState.DISCOVERY}>
    <ProfileCardView profileData={sampleRandomImage('user-ava', 'peace_sign')} onBack={action('back')} onHome={action('home')} />
  </KioskProviders>
);

const CARD_FRAME = 'relative flex h-screen w-[640px] items-center justify-center bg-white';
const peace = { gestureName: 'Victory', confidence: 0.94, handedness: 'Right' as const };

export const CardNoGesture: Story = () => (
  <div className={CARD_FRAME}>
    <RandomImageCard detectedGesture={null} />
  </div>
);

export const CardLoading: Story = () => (
  <div className={CARD_FRAME}>
    <RandomImageCard detectedGesture={peace} isLoading />
  </div>
);

export const CardMatch: Story = () => (
  <div className={CARD_FRAME}>
    <RandomImageCard
      detectedGesture={peace}
      imageData={sampleRandomImage('user-dev', 'peace_sign')}
      timerProgress={60}
      onViewProfile={action('viewProfile')}
    />
  </div>
);

export const CardFlash: Story = () => (
  <div className={CARD_FRAME}>
    <RandomImageCard detectedGesture={peace} imageData={sampleRandomImage('user-dev', 'peace_sign')} timerProgress={100} isFlashing />
  </div>
);

export const CardError: Story = () => (
  <div className={CARD_FRAME}>
    <RandomImageCard detectedGesture={peace} error="No images available for peace_sign gesture in your organization" />
  </div>
);

/** Border animates 0 -> 100 on a loop. */
export const Progress: Story = () => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setProgress((p) => (p >= 100 ? 0 : p + 2)), 50);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="relative m-10 h-[400px] w-[300px] rounded-[24px] bg-white">
      <BorderProgress progress={progress} borderRadius={24} />
    </div>
  );
};

export const Cooldown: Story = () => (
  <div className="relative h-40 p-6">
    <CooldownIndicator isOnCooldown timeRemaining={1800} />
  </div>
);

export const Help: Story = () => <HelpPopup isOpen onClose={action('close')} />;

export const Next: Story = () => (
  <div className="flex gap-6 p-6">
    <NextButton onNext={action('next')} />
    <NextButton onNext={action('next')} disabled />
  </div>
);
