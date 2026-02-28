import React from 'react';

interface NextButtonProps {
  onNext: () => void;
  disabled?: boolean;
}

/**
 * Next Button Component
 * TODO: Implement bypass gesture for next profile
 */
export const NextButton: React.FC<NextButtonProps> = ({ onNext, disabled = false }) => {
  return (
    <button onClick={onNext} disabled={disabled}>
      {/* TODO: Implement NextButton styling */}
      Next Profile
    </button>
  );
};
