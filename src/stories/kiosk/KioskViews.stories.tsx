/**
 * Kiosk screens and widgets rendered on their own, inside the kiosk provider
 * stack. Move the mouse to drive the hand cursor; hold the button to click.
 */

import { action, type Story, type StoryDefault } from '@ladle/react';
import { IdleScreen } from '@/features/kiosk/components/IdleScreen';
import { InfoOverlay } from '@/features/kiosk/components/InfoOverlay';
import { PinnedRegistrationQR, RegistrationQRDisplay } from '@/features/kiosk';
import { HubView } from '@/features/hub';
import { PixiHub } from '@/features/hub/components/PixiHub';
import { ProfileCard } from '@/features/hub/components/ProfileCard';
import { KioskProviders } from '../_support/KioskProviders';
import { Scenario } from '../_support/StoryEnvironment';
import { ORG_ID } from '../_support/fixtures/data';
import { sampleHubUser } from '../_support/fixtures/samples';

export default { title: 'Kiosk / Views', meta: { auth: 'kiosk', cv: true } } satisfies StoryDefault;

export const Idle: Story = () => (
  <KioskProviders>
    <IdleScreen />
  </KioskProviders>
);

export const Info: Story = () => (
  <KioskProviders>
    <InfoOverlay onClose={action('close')} />
  </KioskProviders>
);

export const RegistrationQR: Story = () => (
  <KioskProviders>
    <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,#58e7f7_0%,#fefffb_100%)]">
      <RegistrationQRDisplay size={260} />
    </div>
  </KioskProviders>
);

export const RegistrationQRFailed: Story = () => (
  <KioskProviders>
    <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,#58e7f7_0%,#fefffb_100%)]">
      <RegistrationQRDisplay size={260} />
    </div>
  </KioskProviders>
);
RegistrationQRFailed.meta = { fail: ['fn:generate-registration-qr'], allowConsoleErrors: true };

export const PinnedQR: Story = () => (
  <KioskProviders>
    <div className="h-full bg-[linear-gradient(180deg,#58e7f7_0%,#fefffb_100%)]">
      <PinnedRegistrationQR side="left" verticalCenter />
      <PinnedRegistrationQR side="right" top={24} qrSize={110} label="join us!" />
    </div>
  </KioskProviders>
);

export const Hub: Story = () => (
  <KioskProviders>
    <HubView />
  </KioskProviders>
);

/** A hub with nobody in it yet. */
export const HubEmpty: Story = () => (
  <Scenario
    tables={(t) => {
      t.cropped_image = [];
    }}
  >
    <KioskProviders>
      <HubView />
    </KioskProviders>
  </Scenario>
);

export const HubCanvasOnly: Story = () => (
  <KioskProviders>
    <PixiHub orgId={ORG_ID} onCharacterClick={action('characterClick')} />
  </KioskProviders>
);

export const ProfileCards: Story = () => (
  <div className="flex flex-wrap gap-6 bg-[#58e7f7] p-6">
    <ProfileCard userData={sampleHubUser('user-ava')} colorIndex={0} onClick={action('click')} />
    <ProfileCard userData={sampleHubUser('user-ben')} colorIndex={1} onClick={action('click')} />
    <ProfileCard userData={sampleHubUser('user-cleo')} colorIndex={2} onClick={action('click')} />
    <ProfileCard userData={null} colorIndex={3} />
  </div>
);
ProfileCards.meta = { cv: false };
