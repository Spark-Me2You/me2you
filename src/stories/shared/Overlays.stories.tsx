/**
 * Modal, confirm dialog, glass card and the kiosk exit button.
 */

import { useState } from 'react';
import { action, type Story, type StoryDefault } from '@ladle/react';
import { Button, ConfirmDialog, ExitButton, GlassCard, Modal } from '@/shared/components';

export default { title: 'Shared / Overlays' } satisfies StoryDefault;

export const ModalOpen: Story = () => {
  const [open, setOpen] = useState(true);
  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="About me2you">
        <p>Strike a pose, find someone who matched it, and say hi.</p>
      </Modal>
    </div>
  );
};

export const Confirm: Story = () => {
  const [open, setOpen] = useState(true);
  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)}>Delete account</Button>
      <ConfirmDialog
        isOpen={open}
        title="Delete account?"
        message="This removes your profile and photos. It can't be undone."
        onConfirm={() => {
          action('confirm')();
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
};

export const Glass: Story = () => (
  <div className="min-h-screen bg-[linear-gradient(180deg,#58e7f7_0%,#fefffb_100%)] p-10">
    <GlassCard>
      <h2 className="font-jersey text-3xl">glass card</h2>
      <p>Frosted container used on the kiosk screens.</p>
    </GlassCard>
  </div>
);

export const Exit: Story = () => (
  <div className="relative h-40 p-6">
    <ExitButton onClick={action('exit')} />
  </div>
);

export const ExitCompact: Story = () => (
  <div className="relative h-40 p-6">
    <ExitButton onClick={action('exit')} label="back" compact />
  </div>
);
