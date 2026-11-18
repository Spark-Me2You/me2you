/**
 * Kiosk Feature Module
 * Components and services for kiosk-specific functionality
 */

export { RegistrationQRDisplay } from './components/RegistrationQRDisplay';
export { PinnedRegistrationQR } from './components/PinnedRegistrationQR';
export { CameraPreview } from './components/CameraPreview';
export { RegistrationQRProvider, useRegistrationQR } from './context/RegistrationQRContext';
export { KioskActivityProvider, useKioskActivity } from './inactivity/KioskActivityContext';
export { ReturnHome } from './inactivity/ReturnHome';
