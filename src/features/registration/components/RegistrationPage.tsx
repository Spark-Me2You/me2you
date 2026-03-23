/**
 * RegistrationPage Component
 * Main registration wizard that coordinates all registration steps
 */

import React from 'react';
import { useRegistration, type RegistrationStep } from '../hooks/useRegistration';
import { SignUpStep } from './SignUpStep';
import { ProfileStep } from './ProfileStep';
import { PhotoStep } from './PhotoStep';
import { SuccessStep } from './SuccessStep';
import styles from './RegistrationPage.module.css';

/**
 * Progress indicator for registration steps
 */
const ProgressIndicator: React.FC<{ currentStep: RegistrationStep }> = ({ currentStep }) => {
  const steps: RegistrationStep[] = ['signup', 'profile', 'photo', 'success'];
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className={styles.progressContainer}>
      {steps.slice(0, -1).map((step, index) => (
        <div
          key={step}
          className={`${styles.progressDot} ${
            index < currentIndex ? styles.completed : ''
          } ${index === currentIndex ? styles.active : ''}`}
        />
      ))}
    </div>
  );
};

/**
 * RegistrationPage Component
 * Multi-step registration wizard
 */
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
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.logo}>me2you</h1>
      </header>

      {currentStep !== 'success' && (
        <ProgressIndicator currentStep={currentStep} />
      )}

      <main className={styles.mainContent}>
        {renderStep()}
      </main>

      <footer className={styles.footer}>
        <p className={styles.footerText}>SPARK Space Interactive Installation</p>
      </footer>
    </div>
  );
};
