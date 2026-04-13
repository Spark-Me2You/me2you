/**
 * useRegistration Hook
 * Manages multi-step registration flow state
 */

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/core/auth/AuthContext";
import { supabase } from "@/core/supabase/client";
import { userRegistrationAuthService } from "@/core/supabase/userRegistrationAuth";
import {
  registrationService,
  type RegistrationFormData,
  type RegistrationResult,
} from "../services/registrationService";
import { useRegistrationContext } from "../context/RegistrationContext";
import { faceCropService, type CropMetadata } from "../services/faceCropService";

/**
 * Registration steps
 */
export type RegistrationStep = "signup" | "profile" | "photo" | "bobblehead" | "success";

/**
 * Registration state
 */
export interface RegistrationState {
  currentStep: RegistrationStep;
  formData: Partial<RegistrationFormData>;
  isSubmitting: boolean;
  error: string | null;
  result: RegistrationResult | null;
  registrationComplete: boolean;
  croppedPhoto: Blob | null;
  cropMetadata: CropMetadata | null;
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
  registrationComplete: boolean;
  croppedPhotoUrl: string | null;

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
  handleBobbleheadSubmit: (joinNetwork: boolean) => Promise<boolean>;
}

const STEP_ORDER: RegistrationStep[] = [
  "signup",
  "profile",
  "photo",
  "bobblehead",
  "success",
];

/**
 * Custom hook for managing registration flow
 */
export const useRegistration = (): UseRegistrationReturn => {
  const { signUpUser, signInUser, setUserProfile } = useAuth();
  const { org_id } = useRegistrationContext();

  const [state, setState] = useState<RegistrationState>({
    currentStep: "signup",
    formData: {},
    isSubmitting: false,
    error: null,
    result: null,
    registrationComplete: false,
    croppedPhoto: null,
    cropMetadata: null,
  });

  const [croppedPhotoUrl, setCroppedPhotoUrl] = useState<string | null>(null);

  // Cleanup cropped photo URL on unmount
  useEffect(() => {
    return () => {
      if (croppedPhotoUrl) {
        URL.revokeObjectURL(croppedPhotoUrl);
      }
    };
  }, [croppedPhotoUrl]);

  // Step navigation
  const goToStep = useCallback((step: RegistrationStep) => {
    setState((prev) => ({ ...prev, currentStep: step, error: null }));
  }, []);

  const nextStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setState((prev) => ({
        ...prev,
        currentStep: STEP_ORDER[currentIndex + 1],
        error: null,
      }));
    }
  }, [state.currentStep]);

  const previousStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex > 0) {
      setState((prev) => ({
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
    setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, ...data },
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Step handlers
  const handleSignUp = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

      try {
        // Sign up via AuthProvider (updates auth context)
        await signUpUser(email, password);

        // Get current authenticated user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated after signup");

        // Create minimal user record immediately with org_id from verified QR token
        await userRegistrationAuthService.createMinimalUserRecord(
          user.id,
          org_id,
        );

        // Store credentials in form data (needed for complete flow reference)
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          formData: { ...prev.formData, email, password },
        }));

        // Move to next step
        nextStep();
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Signup failed";
        const errorCode = (error as Error & { code?: string })?.code;

        // AUTOMATIC RESCUE FLOW: Check if this is a "user already exists" error
        // Using error code for robust detection (Supabase returns "user_already_exists" or similar)
        const isUserExistsError =
          errorCode === "user_already_exists" ||
          errorCode === "23505" || // PostgreSQL unique violation
          (errorMessage.toLowerCase().includes("already") &&
            errorMessage.toLowerCase().includes("registered"));

        if (isUserExistsError) {
          console.log(
            "[handleSignUp] User already exists (code: " +
              errorCode +
              "), attempting Automatic Rescue...",
          );

          try {
            // SECURITY CRITICAL: Must authenticate first before revealing any info
            await signInUser(email, password);

            // Get authenticated user
            const {
              data: { user: signedInUser },
            } = await supabase.auth.getUser();
            if (!signedInUser)
              throw new Error("User not authenticated after sign-in");

            // Only after successful sign-in, check onboarding status
            const isComplete =
              await userRegistrationAuthService.checkOnboardingComplete(
                signedInUser.id,
              );

            if (isComplete === false) {
              // Incomplete onboarding - resume flow
              console.log(
                "[handleSignUp] Incomplete onboarding detected, resuming...",
              );
              setState((prev) => ({
                ...prev,
                isSubmitting: false,
                error: null,
                formData: { ...prev.formData, email, password },
              }));
              nextStep(); // Resume at profile step
              return true;
            } else if (isComplete === true) {
              // Complete onboarding - redirect to login
              await userRegistrationAuthService.signOut();
              setState((prev) => ({
                ...prev,
                isSubmitting: false,
                error: "Account already exists. Please log in instead.",
              }));
              return false;
            } else {
              // User record not found - shouldn't happen but handle gracefully
              await userRegistrationAuthService.signOut();
              setState((prev) => ({
                ...prev,
                isSubmitting: false,
                error:
                  "Account exists but profile not found. Please contact support.",
              }));
              return false;
            }
          } catch (rescueError) {
            // Sign-in failed - show generic error (don't reveal if email exists)
            console.log(
              "[handleSignUp] Rescue flow sign-in failed:",
              rescueError,
            );
            setState((prev) => ({
              ...prev,
              isSubmitting: false,
              error: "Invalid email or password.",
            }));
            return false;
          }
        }

        // Not an "already exists" error - show original error
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          error: errorMessage,
        }));
        return false;
      }
    },
    [signUpUser, signInUser, nextStep],
  );

  const handlePhotoSubmit = useCallback(
    async (photo: Blob | null, category: string): Promise<boolean> => {
      if (!photo) {
        setState((prev) => ({ ...prev, error: "Please take a photo" }));
        return false;
      }

      setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Update profile row with complete data and mark onboarding complete
        const { name, status, pronouns, major, interests } = state.formData;
        if (!name || name.trim() === "") throw new Error("Name is required");

        const profile = await userRegistrationAuthService.updateUserProfile(
          user.id,
          {
            name: name.trim(),
            status: status?.trim() || null,
            pronouns: pronouns?.trim() || null,
            major: major?.trim() || null,
            interests: interests || null,
          },
        );

        setUserProfile(profile);

        // Upload gesture photo to gesture_image table
        const gestureImageRecord =
          await registrationService.uploadGesturePhoto(
            photo,
            user.id,
            org_id,
            category,
          );

        // Run face cropping to get bobblehead
        console.log('[useRegistration] Running face crop...');
        const cropResult = await faceCropService.cropFace(photo);
        console.log('[useRegistration] Face crop complete');

        // Create preview URL for cropped photo
        const previewUrl = URL.createObjectURL(cropResult.croppedBlob);
        setCroppedPhotoUrl(previewUrl);

        // Store gesture photo result
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          formData: { ...prev.formData, photo },
          result: {
            user,
            profile,
            imageId: gestureImageRecord.id,
          },
          croppedPhoto: cropResult.croppedBlob,
          cropMetadata: cropResult.cropMetadata,
        }));

        // Advance to bobblehead step
        nextStep();
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to upload photo";
        setState((prev) => ({ ...prev, isSubmitting: false, error: message }));
        return false;
      }
    },
    [state.formData, setUserProfile, nextStep, org_id],
  );

  const handleProfileSubmit = useCallback(async (): Promise<boolean> => {
    const { name } = state.formData;

    if (!name || name.trim() === "") {
      setState((prev) => ({ ...prev, error: "Name is required" }));
      return false;
    }

    // Just validate and advance — profile DB write happens in handlePhotoSubmit
    // so the user row always exists immediately before the photo upload.
    nextStep(); // → photo
    return true;
  }, [state.formData, nextStep]);

  const handleBobbleheadSubmit = useCallback(
    async (joinNetwork: boolean): Promise<boolean> => {
      setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

      try {
        if (joinNetwork && state.croppedPhoto && state.cropMetadata?.landmarks) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          // Upload cropped photo with landmarks to cropped_image table
          console.log('[useRegistration] Uploading cropped photo...');
          await registrationService.uploadCroppedPhotoWithLandmarks(
            state.croppedPhoto,
            user.id,
            org_id,
            state.cropMetadata.landmarks,
          );
          console.log('[useRegistration] Cropped photo uploaded successfully');
        } else {
          console.log('[useRegistration] User declined network join, skipping cropped photo upload');
        }

        // Registration complete - keep user signed in and signal redirect
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          registrationComplete: true,
        }));

        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to complete registration";
        setState((prev) => ({ ...prev, isSubmitting: false, error: message }));
        return false;
      }
    },
    [state.croppedPhoto, state.cropMetadata, org_id],
  );

  return {
    // State
    currentStep: state.currentStep,
    formData: state.formData,
    isSubmitting: state.isSubmitting,
    error: state.error,
    result: state.result,
    registrationComplete: state.registrationComplete,
    croppedPhotoUrl,

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
    handleBobbleheadSubmit,
  };
};
