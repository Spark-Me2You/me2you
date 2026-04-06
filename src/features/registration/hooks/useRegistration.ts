/**
 * useRegistration Hook
 * Manages multi-step registration flow state
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/core/auth/AuthContext';
import { supabase } from '@/core/supabase/client';
import { userRegistrationAuthService } from '@/core/supabase/userRegistrationAuth';
import { registrationService, type RegistrationFormData, type RegistrationResult } from '../services/registrationService';
import { useRegistrationContext } from '../context/RegistrationContext';

/**
 * Registration steps
 */
export type RegistrationStep = 'signup' | 'profile' | 'photo' | 'success';

/**
 * Registration state
 */
export interface RegistrationState {
  currentStep: RegistrationStep;
  formData: Partial<RegistrationFormData>;
  isSubmitting: boolean;
  error: string | null;
  result: RegistrationResult | null;
}

/**
 * useRegistration return type
 */
export interface UseRegistrationReturn {
  // State
  currentStep: RegistrationStep;
  formData: Partial<RegistrationFormData>;
  isSubmitting: boolean;
  error: string | null;
  result: RegistrationResult | null;

  // Step navigation
  goToStep: (step: RegistrationStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;

  // Form data
  updateFormData: (data: Partial<RegistrationFormData>) => void;
  clearError: () => void;

  // Step handlers
  handleSignUp: (email: string, password: string) => Promise<boolean>;
  handleProfileSubmit: () => Promise<boolean>;
  handlePhotoSubmit: (photo: Blob | null, category: string) => Promise<boolean>;
}

const STEP_ORDER: RegistrationStep[] = ['signup', 'profile', 'photo', 'success'];

/**
 * Custom hook for managing registration flow
 */
export const useRegistration = (): UseRegistrationReturn => {
  const { signUpUser, setUserProfile } = useAuth();
  const { org_id } = useRegistrationContext();

  const [state, setState] = useState<RegistrationState>({
    currentStep: 'signup',
    formData: {},
    isSubmitting: false,
    error: null,
    result: null,
  });

  // Step navigation
  const goToStep = useCallback((step: RegistrationStep) => {
    setState(prev => ({ ...prev, currentStep: step, error: null }));
  }, []);

  const nextStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setState(prev => ({
        ...prev,
        currentStep: STEP_ORDER[currentIndex + 1],
        error: null,
      }));
    }
  }, [state.currentStep]);

  const previousStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex > 0) {
      setState(prev => ({
        ...prev,
        currentStep: STEP_ORDER[currentIndex - 1],
        error: null,
      }));
    }
  }, [state.currentStep]);

  const isFirstStep = state.currentStep === STEP_ORDER[0];
  const isLastStep = state.currentStep === STEP_ORDER[STEP_ORDER.length - 1];

  // Form data management
  const updateFormData = useCallback((data: Partial<RegistrationFormData>) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...data },
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Step handlers
  const handleSignUp = useCallback(async (email: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      // Sign up via AuthProvider (updates auth context)
      await signUpUser(email, password);

      // Store credentials in form data (needed for complete flow reference)
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        formData: { ...prev.formData, email, password },
      }));

      // Move to next step
      nextStep();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed';
      setState(prev => ({ ...prev, isSubmitting: false, error: message }));
      return false;
    }
  }, [signUpUser, nextStep]);

  const handlePhotoSubmit = useCallback(async (photo: Blob | null, category: string): Promise<boolean> => {
    if (!photo) {
      setState(prev => ({ ...prev, error: 'Please take a photo' }));
      return false;
    }

    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create profile row here so it always exists before the photo upload,
      // regardless of how the user navigated to this step.
      const { name, status, pronouns, major, interests } = state.formData;
      if (!name || name.trim() === '') throw new Error('Name is required');

      const profile = await registrationService.createProfile(
        {
          name: name.trim(),
          status: status?.trim() || null,
          pronouns: pronouns?.trim() || null,
          major: major?.trim() || null,
          interests: interests || null,
        },
        org_id
      );

      setUserProfile(profile);

      const imageRecord = await registrationService.uploadPhotoAndCreateRecord(photo, user.id, org_id, category);

      // Sign out now that registration is fully complete
      await userRegistrationAuthService.signOut();

      setState(prev => ({
        ...prev,
        isSubmitting: false,
        formData: { ...prev.formData, photo },
        result: {
          user,
          profile,
          imageId: imageRecord.id,
        },
      }));

      nextStep(); // → success
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload photo';
      setState(prev => ({ ...prev, isSubmitting: false, error: message }));
      return false;
    }
  }, [state.formData, setUserProfile, nextStep, org_id]);

  const handleProfileSubmit = useCallback(async (): Promise<boolean> => {
    const { name } = state.formData;

    if (!name || name.trim() === '') {
      setState(prev => ({ ...prev, error: 'Name is required' }));
      return false;
    }

    // Just validate and advance — profile DB write happens in handlePhotoSubmit
    // so the user row always exists immediately before the photo upload.
    nextStep(); // → photo
    return true;
  }, [state.formData, nextStep]);

  return {
    // State
    currentStep: state.currentStep,
    formData: state.formData,
    isSubmitting: state.isSubmitting,
    error: state.error,
    result: state.result,

    // Step navigation
    goToStep,
    nextStep,
    previousStep,
    isFirstStep,
    isLastStep,

    // Form data
    updateFormData,
    clearError,

    // Step handlers
    handleSignUp,
    handleProfileSubmit,
    handlePhotoSubmit,
  };
};
