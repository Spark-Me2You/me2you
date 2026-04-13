/**
 * RegistrationPage Component
 * Main registration wizard — Figma mobile redesign
 * Now with QR code token validation
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { kioskQrService } from '@/core/supabase/kioskQrService';
import { RegistrationProvider, type RegistrationContextType } from '../context/RegistrationContext';
import { RegistrationError } from './RegistrationError';
import { useRegistration } from '../hooks/useRegistration';
import { SignUpStep } from './SignUpStep';
import { ProfileStep } from './ProfileStep';
import { PhotoStep } from './PhotoStep';
import { BobbleheadPreviewStep } from './BobbleheadPreviewStep';
import { SuccessStep } from './SuccessStep';
import styles from './RegistrationPage.module.css';
import me2youLogo from '../../../assets/me2you.png';

/**
 * Registration Wizard (inner component after token validation)
 */
const RegistrationWizard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    handleBobbleheadSubmit,
    previousStep,
    goToStep,
    registrationComplete,
    croppedPhotoUrl,
  } = useRegistration();

  // Redirect to profile page when registration completes
  useEffect(() => {
    if (registrationComplete) {
      navigate('/user/profile', { replace: true });
    }
  }, [registrationComplete, navigate]);

  // Dev step-jump: ?step=profile etc.
  useEffect(() => {
    const step = searchParams.get('step');
    if (step) goToStep(step as 'signup' | 'profile' | 'photo' | 'bobblehead' | 'success');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      case 'bobblehead': {
        const previewUrl = croppedPhotoUrl ?? (searchParams.get('dev') === 'true' ? 'https://placehold.co/300x300' : null);
        return previewUrl ? (
          <BobbleheadPreviewStep
            croppedPhotoUrl={previewUrl}
            onSubmit={handleBobbleheadSubmit}
            onRetake={() => goToStep('photo')}
            isSubmitting={isSubmitting}
            error={error}
            onClearError={clearError}
          />
        ) : null;
      }

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

/**
 * Registration Page (outer component with token validation)
 */
export const RegistrationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [registrationContext, setRegistrationContext] = useState<RegistrationContextType | null>(null);
  const [tokenError, setTokenError] = useState<{ message: string; code?: string } | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      // Dev bypass: ?dev=true skips QR token check
      if (searchParams.get('dev') === 'true') {
        setRegistrationContext({ org_id: '00000000-0000-0000-0000-000000000000', org_name: 'Dev Org' });
        setIsValidating(false);
        return;
      }

      const token = searchParams.get('token');

      if (!token) {
        setTokenError({
          message: 'No registration token provided. Please scan a QR code at a kiosk.',
          code: 'MISSING_TOKEN',
        });
        setIsValidating(false);
        return;
      }

      try {
        const response = await kioskQrService.verifyRegistrationToken(token);

        if (!response.success) {
          setTokenError({
            message: response.error || 'Invalid or expired QR code',
            code: response.error_code,
          });
          return;
        }

        if (!response.org_id || !response.org_name) {
          setTokenError({
            message: 'Invalid token response. Please try scanning again.',
            code: 'INVALID_RESPONSE',
          });
          return;
        }

        setRegistrationContext({
          org_id: response.org_id,
          org_name: response.org_name,
        });
      } catch (err) {
        console.error('[RegistrationPage] Token validation error:', err);
        setTokenError({
          message: 'Failed to validate registration code. Please check your connection and try again.',
          code: 'NETWORK_ERROR',
        });
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [searchParams]);

  // Show loading state
  if (isValidating) {
    return (
      <div className={styles.page}>
        <img src={me2youLogo} alt="me2you" className={styles.logo} />
        <div className={styles.stepContent}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            fontFamily: '"Jersey 10", sans-serif',
            fontSize: '32px',
            color: '#333',
          }}>
            validating...
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (tokenError) {
    return <RegistrationError message={tokenError.message} errorCode={tokenError.code} />;
  }

  // Show registration flow with context
  if (!registrationContext) {
    return <RegistrationError message="Unable to load registration. Please try again." />;
  }

  return (
    <RegistrationProvider context={registrationContext}>
      <RegistrationWizard />
    </RegistrationProvider>
  );
};
