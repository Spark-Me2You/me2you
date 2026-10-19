/**
 * Pieces of the mobile user pages, rendered with sample props.
 */

import { useState } from 'react';
import { action, type Story, type StoryDefault } from '@ladle/react';
import { UserProfileEditForm } from '@/features/user/components/UserProfileEditForm';
import { UserPhotoCaptureModal } from '@/features/user/components/UserPhotoCaptureModal';
import { UserMiiPixiPreview } from '@/features/user/components/UserMiiPixiPreview';
import { CreateAccountPrompt } from '@/features/user/components/CreateAccountPrompt';
import type { Accessory } from '@/core/auth/AuthContext';
import { sampleAccessory, sampleLandmarks, sampleProfileWithImage } from '../_support/fixtures/samples';
import { placeholderImageUrl } from '../_support/fixtures/images';
import { ME_ID } from '../_support/fixtures/data';

export default { title: 'Mobile / User Components', meta: { auth: 'user' } } satisfies StoryDefault;

const MOBILE_FRAME = 'mx-auto min-h-screen w-full max-w-[430px] bg-[linear-gradient(to_bottom,#58e7f7_0%,#fefffb_100%)] p-4';

const save = async (data: unknown) => action('save')(data);

export const EditForm: Story = () => (
  <div className={MOBILE_FRAME}>
    <UserProfileEditForm
      initialData={sampleProfileWithImage()}
      gestureImageUrl={placeholderImageUrl(`${ME_ID}/wave.jpg`)}
      accessorySettings={sampleAccessory}
      bobbleheadLandmarks={sampleLandmarks}
      onSave={save}
      onCancel={action('cancel')}
      onChangePhoto={action('changePhoto')}
      isSubmitting={false}
      error={null}
    />
  </div>
);

export const EditFormSaving: Story = () => (
  <div className={MOBILE_FRAME}>
    <UserProfileEditForm
      initialData={sampleProfileWithImage()}
      onSave={save}
      onCancel={action('cancel')}
      onChangePhoto={action('changePhoto')}
      isSubmitting
      error={null}
    />
  </div>
);

export const EditFormError: Story = () => (
  <div className={MOBILE_FRAME}>
    <UserProfileEditForm
      initialData={sampleProfileWithImage()}
      onSave={save}
      onCancel={action('cancel')}
      onChangePhoto={action('changePhoto')}
      isSubmitting={false}
      error="Couldn't save your changes."
    />
  </div>
);

/** Retake-photo modal; the fake camera supplies the preview. */
export const PhotoCapture: Story = () => {
  const [open, setOpen] = useState(true);
  return (
    <UserPhotoCaptureModal
      isOpen={open}
      onClose={() => setOpen(false)}
      onCapture={async (photo, category) => action('capture')({ size: photo.size, category })}
      isSubmitting={false}
    />
  );
};

export const PhotoCaptureNoCamera: Story = () => (
  <UserPhotoCaptureModal isOpen onClose={action('close')} onCapture={async () => {}} isSubmitting={false} />
);
PhotoCaptureNoCamera.meta = { camera: 'denied', allowConsoleErrors: true };

const ACCESSORIES: (Accessory | null)[] = [null, 'sunglasses', 'hat', 'balloon'];

export const MiiPreview: Story = () => (
  <div className="flex flex-wrap gap-6 p-6">
    {ACCESSORIES.map((accessory) => (
      <div key={accessory ?? 'none'} className="flex flex-col items-center gap-2">
        <UserMiiPixiPreview
          bobbleheadUrl={placeholderImageUrl(`${ME_ID}/profile_cropped.png`)}
          accessorySettings={{ ...sampleAccessory, selected_accessory: accessory }}
          landmarks={sampleLandmarks}
          width={220}
          height={220}
        />
        <span className="font-jersey text-xl">{accessory ?? 'no accessory'}</span>
      </div>
    ))}
  </div>
);

export const MiiPreviewNoPhoto: Story = () => (
  <div className="p-6">
    <UserMiiPixiPreview bobbleheadUrl={null} accessorySettings={sampleAccessory} landmarks={null} width={220} height={220} />
  </div>
);

export const CreateAccount: Story = () => <CreateAccountPrompt onClose={action('close')} />;
CreateAccount.meta = { auth: 'unauthenticated' };
