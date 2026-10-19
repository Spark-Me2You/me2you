/**
 * Registration: the full /register page (token handshake + wizard) and each
 * wizard step on its own. In the full flow, sign up with any email/password;
 * the photo step uses the fake camera and simulated face crop.
 */

import { useState } from 'react';
import { action, type Story, type StoryDefault } from '@ladle/react';
import App from '@/App';
import type { RegistrationFormData } from '@/features/registration/services/registrationService';
import { SignUpStep } from '@/features/registration/components/SignUpStep';
import { ProfileStep } from '@/features/registration/components/ProfileStep';
import { PhotoStep } from '@/features/registration/components/PhotoStep';
import { BobbleheadPreviewStep } from '@/features/registration/components/BobbleheadPreviewStep';
import { SuccessStep } from '@/features/registration/components/SuccessStep';
import { RegistrationError } from '@/features/registration/components/RegistrationError';
import { GoBackWarning } from '@/features/registration/components/GoBackWarning';
import { placeholderImageUrl } from '../_support/fixtures/images';

export default { title: 'Mobile / Registration' } satisfies StoryDefault;

/** Async step callbacks: log the call, then report success. */
const succeed =
  (name: string) =>
  async (...args: unknown[]) => {
    action(name)(args);
    return true;
  };

export const FullFlow: Story = () => <App />;
FullFlow.meta = { route: '/register?token=mock-reg-demo' };

export const Validating: Story = () => <App />;
Validating.meta = { route: '/register?token=mock-reg-demo', delay: 'forever' };

export const TokenExpired: Story = () => <App />;
TokenExpired.meta = { route: '/register?token=expired' };

export const TokenInvalid: Story = () => <App />;
TokenInvalid.meta = { route: '/register?token=invalid' };

export const TokenMissing: Story = () => <App />;
TokenMissing.meta = { route: '/register' };

export const TokenNetworkError: Story = () => <App />;
TokenNetworkError.meta = {
  route: '/register?token=mock-reg-demo',
  fail: ['fn:verify-registration-token'],
  allowConsoleErrors: true,
};

const STEP_FRAME = 'relative mx-auto min-h-screen w-full max-w-[430px] bg-[linear-gradient(to_bottom,#58e7f7_0%,#fefffb_100%)] pt-[120px]';

export const StepSignUp: Story = () => (
  <div className={STEP_FRAME}>
    <SignUpStep onSubmit={succeed('signUp')} isSubmitting={false} error={null} onClearError={action('clearError')} />
  </div>
);

export const StepSignUpError: Story = () => (
  <div className={STEP_FRAME}>
    <SignUpStep
      onSubmit={succeed('signUp')}
      isSubmitting={false}
      error="An account with this email already exists."
      onClearError={action('clearError')}
    />
  </div>
);

export const StepProfile: Story = () => {
  const [formData, setFormData] = useState<Partial<RegistrationFormData>>({
    name: 'Sam Rivera',
    pronouns: 'they/them',
    major: 'Computer Science',
    interests: ['climbing', 'synths'],
  });
  return (
    <div className={STEP_FRAME}>
      <ProfileStep
        formData={formData}
        onUpdateFormData={(data) => setFormData((prev) => ({ ...prev, ...data }))}
        onSubmit={succeed('submitProfile')}
        onBack={action('back')}
        isSubmitting={false}
        error={null}
        onClearError={action('clearError')}
      />
    </div>
  );
};

export const StepPhoto: Story = () => (
  <div className={STEP_FRAME}>
    <PhotoStep onSubmit={succeed('submitPhoto')} onBack={action('back')} isSubmitting={false} error={null} onClearError={action('clearError')} />
  </div>
);

export const StepPhotoNoFace: Story = () => (
  <div className={STEP_FRAME}>
    <PhotoStep
      onSubmit={succeed('submitPhoto')}
      onBack={action('back')}
      isSubmitting={false}
      error="We couldn't find a face in that photo. Try again with your face centered."
      onClearError={action('clearError')}
    />
  </div>
);
StepPhotoNoFace.meta = { face: false };

export const StepBobblehead: Story = () => (
  <div className={STEP_FRAME}>
    <BobbleheadPreviewStep
      croppedPhotoUrl={placeholderImageUrl('user-me/profile_cropped.png')}
      onSubmit={succeed('submitBobblehead')}
      onRetake={action('retake')}
      isSubmitting={false}
      error={null}
      onClearError={action('clearError')}
    />
  </div>
);

export const StepBobbleheadSubmitting: Story = () => (
  <div className={STEP_FRAME}>
    <BobbleheadPreviewStep
      croppedPhotoUrl={placeholderImageUrl('user-me/profile_cropped.png')}
      onSubmit={succeed('submitBobblehead')}
      onRetake={action('retake')}
      isSubmitting
      error={null}
      onClearError={action('clearError')}
    />
  </div>
);

export const StepSuccess: Story = () => <SuccessStep userName="Sam Rivera" />;

export const ErrorScreen: Story = () => (
  <RegistrationError message="This QR code has expired. Scan a fresh one at the kiosk." errorCode="TOKEN_EXPIRED" />
);

export const GoBackConfirm: Story = () => <GoBackWarning onConfirm={action('confirm')} onCancel={action('cancel')} />;
