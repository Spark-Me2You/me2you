/**
 * Claim flow: what a phone sees after scanning a kiosk claim QR, plus the
 * QR pieces the kiosk shows. Tokens are seeded per story via <Scenario>.
 */

import { action, type Story, type StoryDefault } from '@ladle/react';
import App from '@/App';
import { ClaimQR } from '@/features/claim/components/ClaimQR';
import { ClaimSection } from '@/features/claim/components/ClaimSection';
import { ClaimScanner } from '@/features/claim/components/ClaimScanner';
import { MessageComposePage } from '@/features/messages/components/MessageComposePage';
import { SendMessageButton } from '@/features/messages/components/SendMessageButton';
import { Scenario } from '../_support/StoryEnvironment';
import type { Tables } from '../_support/mocks/mockDb';
import { claimTokenRow, sampleClaimPayload } from '../_support/fixtures/samples';

export default { title: 'Mobile / Claim' } satisfies StoryDefault;

const withToken = (id: string, type: 'score' | 'drawing' | 'message') => (tables: Tables) => {
  tables.claim_tokens = [...(tables.claim_tokens ?? []), claimTokenRow(id, type)];
};

/** Score claim executes immediately and lands on the success page. */
export const ClaimScore: Story = () => (
  <Scenario tables={withToken('token-score', 'score')}>
    <App />
  </Scenario>
);
ClaimScore.meta = { route: '/claim/token-score', auth: 'user' };

/** Drawing claim lands on the user's gallery with the new drawing. */
export const ClaimDrawing: Story = () => (
  <Scenario tables={withToken('token-drawing', 'drawing')}>
    <App />
  </Scenario>
);
ClaimDrawing.meta = { route: '/claim/token-drawing', auth: 'user' };

/** Message claim shows the compose screen before sending. */
export const ClaimMessage: Story = () => (
  <Scenario tables={withToken('token-message', 'message')}>
    <App />
  </Scenario>
);
ClaimMessage.meta = { route: '/claim/token-message', auth: 'user' };

export const ClaimUnknownToken: Story = () => <App />;
ClaimUnknownToken.meta = { route: '/claim/token-missing', auth: 'user', allowConsoleErrors: true };

/** Signed out: redirected to /user with ?next= so login resumes the claim. */
export const ClaimSignedOut: Story = () => <App />;
ClaimSignedOut.meta = { route: '/claim/token-score' };

export const SuccessPage: Story = () => <App />;
SuccessPage.meta = {
  route: '/claim/success',
  auth: 'user',
  routeState: { payload: { display: { title: 'FlapFlap score', description: 'Claim your score of 27', icon: 'trophy' } } },
};

export const ErrorPage: Story = () => <App />;
ErrorPage.meta = { route: '/claim/error?reason=This+claim+code+has+expired', auth: 'user' };

export const Compose: Story = () => (
  <Scenario tables={withToken('token-message', 'message')}>
    <MessageComposePage tokenId="token-message" recipientName="Ava Chen" />
  </Scenario>
);
Compose.meta = { auth: 'user' };

const KIOSK_PANEL = 'flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#58e7f7_0%,#fefffb_100%)] p-10';

/** Live kiosk QR: generates a token and waits for a phone to claim it. */
export const KioskClaimSection: Story = () => (
  <div className={KIOSK_PANEL}>
    <ClaimSection payload={sampleClaimPayload('score')} onClaimed={action('claimed')} />
  </div>
);
KioskClaimSection.meta = { auth: 'kiosk' };

export const QrGenerating: Story = () => (
  <div className={KIOSK_PANEL}>
    <ClaimQR claim={null} isGenerating error={null} secondsRemaining={0} onRegenerate={action('regenerate')} />
  </div>
);

export const QrReady: Story = () => (
  <div className={KIOSK_PANEL}>
    <ClaimQR
      claim={{ token_id: 'token-demo', claim_url: 'https://me2you.example/claim/token-demo', expires_at: '2099-01-01T00:00:00.000Z' }}
      isGenerating={false}
      error={null}
      secondsRemaining={42}
      onRegenerate={action('regenerate')}
    />
  </div>
);

export const QrExpired: Story = () => (
  <div className={KIOSK_PANEL}>
    <ClaimQR
      claim={{ token_id: 'token-demo', claim_url: 'https://me2you.example/claim/token-demo', expires_at: '2026-01-01T00:00:00.000Z' }}
      isGenerating={false}
      error={null}
      secondsRemaining={0}
      onRegenerate={action('regenerate')}
    />
  </div>
);

export const QrError: Story = () => (
  <div className={KIOSK_PANEL}>
    <ClaimQR claim={null} isGenerating={false} error="Couldn't create a claim code." secondsRemaining={0} onRegenerate={action('regenerate')} />
  </div>
);

/** Kiosk profile card button that opens a message-claim QR. */
export const SendMessage: Story = () => (
  <div className={KIOSK_PANEL}>
    <SendMessageButton recipientId="user-ava" recipientName="Ava Chen" />
  </div>
);
SendMessage.meta = { auth: 'kiosk' };

/** In-app QR scanner, reading frames from the fake camera. */
export const Scanner: Story = () => <ClaimScanner onClose={action('close')} />;
Scanner.meta = { auth: 'user', allowConsoleErrors: true };
