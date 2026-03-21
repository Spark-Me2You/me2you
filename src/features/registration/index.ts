/**
 * Registration Feature Module
 * Public user registration flow for mobile
 */

// Main page component
export { RegistrationPage } from './components/RegistrationPage';

// Individual step components (for testing/customization)
export { SignUpStep } from './components/SignUpStep';
export { ProfileStep } from './components/ProfileStep';
export { PhotoStep } from './components/PhotoStep';
export { SuccessStep } from './components/SuccessStep';

// Hook
export { useRegistration } from './hooks/useRegistration';
export type { RegistrationStep, UseRegistrationReturn } from './hooks/useRegistration';

// Service
export { registrationService } from './services/registrationService';
export type { RegistrationFormData, RegistrationResult } from './services/registrationService';
