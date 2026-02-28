/**
 * Multi-Step Form Hook
 * TODO: Implement step navigation
 */
export const useMultiStepForm = (_totalSteps: number) => {
  // TODO: Implement multi-step form hook

  return {
    currentStep: 1,
    nextStep: () => {},
    previousStep: () => {},
    goToStep: (_step: number) => {},
    isFirstStep: true,
    isLastStep: false,
  };
};
