// /**
//  * Admin Login Page
//  * Main login page for admin authentication
//  */

// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useAuth } from '@/core/auth';
// import { LoginForm } from './LoginForm';

// /**
//  * Admin Login Page Component
//  * Displays login form and handles authentication flow
//  */
// export const AdminLoginPage: React.FC = () => {
//   const navigate = useNavigate();
//   const { signIn, isAuthenticated, authMode } = useAuth();
//   const [error, setError] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(false);

//   /**
//    * Redirect based on auth mode:
//    * - Admin: redirect to org selector
//    * - Kiosk: redirect to app
//    */
//   useEffect(() => {
//     if (isAuthenticated && authMode === 'admin') {
//       console.log('[AdminLoginPage] Already authenticated as admin, redirecting to org selector');
//       navigate('/select-org', { replace: true });
//     } else if (isAuthenticated && authMode === 'kiosk') {
//       console.log('[AdminLoginPage] Already authenticated as kiosk, redirecting to app');
//       navigate('/app', { replace: true });
//     }
//   }, [isAuthenticated, authMode, navigate]);

//   /**
//    * Handle form submission
//    * On success, navigates to org selector (not directly to app)
//    */
//   const handleSubmit = async (email: string, password: string) => {
//     setError(null);
//     setIsLoading(true);

//     try {
//       // Call signIn from auth context
//       await signIn(email, password);
//       console.log('[AdminLoginPage] Admin signed in, navigating to org selector');

//       // On success, navigate to org selector
//       navigate('/select-org', { replace: true });
//     } catch (err) {
//       // Display error message
//       setError(err instanceof Error ? err.message : 'Failed to sign in');
//     } finally {
//       setIsLoading(false);
//     }
//   };
// // ok this is the weird background behind admin
//   return (
//     <div
//       style={{
//         display: 'flex',
//         flexDirection: 'column',
//         justifyContent: 'center',
//         alignItems: 'center',
//         minHeight: '100vh',
//         backgroundColor: '#f5f5f5',
//       }}
//     > //this is main big box for whole thing 
//       <div
//         style={{
//           backgroundColor: '#ffffff',
//           padding: '2rem',
//           borderRadius: '8px',
//           boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
//           width: '90%',
//           maxWidth: '450px',
//         }}
//       >
//         <h1 style={{ marginBottom: '0.5rem', textAlign: 'center', fontSize: '1.75rem' }}>
//           Admin Login
//         </h1>
//         <p style={{ marginBottom: '2rem', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
//           Sign in to access the me2you admin panel
//         </p>
//         <LoginForm onSubmit={handleSubmit} error={error} isLoading={isLoading} />
//       </div>
//     </div>
//   );
// };


/**
 * Admin Login Page
 * Main login page for admin authentication
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import { LoginForm } from './LoginForm';
import { GlassCard } from '@/components/GlassCard';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, authMode } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && authMode === 'admin') {
      navigate('/select-org', { replace: true });
    } else if (isAuthenticated && authMode === 'kiosk') {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, authMode, navigate]);

  const handleSubmit = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await signIn(email, password);
      navigate('/select-org', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassCard>

      {/* Box 1 — Title */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          width: '90%',
          maxWidth: '450px',
          marginBottom: '1rem',
        }}
      >
        <h1 style={{ textAlign: 'center', fontSize: '1.75rem', margin: 0 }}>
          Admin Login
        </h1>
      </div>

      {/* Boxes 2-5 live inside LoginForm */}
      <LoginForm onSubmit={handleSubmit} error={error} isLoading={isLoading} />

    </GlassCard>
  );
};