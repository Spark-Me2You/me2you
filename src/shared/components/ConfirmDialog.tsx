import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
}

/**
 * Confirm Dialog Component
 * TODO: Implement delete confirmations
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Confirm',
  message,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <p>{message}</p>
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <Button onClick={onConfirm} variant="danger">
          Confirm
        </Button>
        <Button onClick={onCancel} variant="secondary">
          Cancel
        </Button>
      </div>
    </Modal>
  );
};
