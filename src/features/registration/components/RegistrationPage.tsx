/**
 * RegistrationPage Component
 * Main registration wizard — Figma mobile redesign
 */

import React from 'react';
import { useRegistration } from '../hooks/useRegistration';
import { SignUpStep } from './SignUpStep';
import { ProfileStep } from './ProfileStep';
import { PhotoStep } from './PhotoStep';
import { SuccessStep } from './SuccessStep';
import styles from './RegistrationPage.module.css';
import me2youLogo from '../../../assets/me2you.png';

export const RegistrationPage: React.FC = () => {
  const {
    currentStep,
    formData,
    isSubmitting,
    error,
    updateFormData,
    clearError,
    handleSignUp,
    handleProfileSubmit,
    handlePhotoSubmit,
    previousStep,
  } = useRegistration();

  const renderStep = () => {
    switch (currentStep) {
      case 'signup':
        return (
          <SignUpStep
            onSubmit={handleSignUp}
            isSubmitting={isSubmitting}
            error={error}
            onClearError={clearError}
          />
        );

      case 'profile':
        return (
          <ProfileStep
            formData={formData}
            onUpdateFormData={updateFormData}
            onSubmit={handleProfileSubmit}
            onBack={previousStep}
            isSubmitting={isSubmitting}
            error={error}
            onClearError={clearError}
          />
        );

      case 'photo':
        return (
          <PhotoStep
            onSubmit={handlePhotoSubmit}
            onBack={previousStep}
            isSubmitting={isSubmitting}
            error={error}
            onClearError={clearError}
          />
        );

      case 'success':
        return <SuccessStep userName={formData.name} />;

      default:
        return null;
    }
  };

  return (
    <div className={styles.page}>
      {currentStep !== 'success' && (
        <img src={me2youLogo} alt="me2you" className={styles.logo} />
      )}
      <div className={styles.stepContent}>
        {renderStep()}
      </div>
    </div>
  );
};
