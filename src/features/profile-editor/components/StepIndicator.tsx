import React from 'react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

/**
 * Step Indicator Component
 * TODO: Implement progress bar
 */
export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
  return (
    <div>
      {/* TODO: Implement StepIndicator */}
      <p>StepIndicator placeholder</p>
      <p>Step {currentStep} of {totalSteps}</p>
    </div>
  );
};
