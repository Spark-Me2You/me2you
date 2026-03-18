// /**
//  * Login Form Component
//  * Minimal skeleton form for admin email/password authentication
//  */

import React, { useState } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
}

// /**
//  * Login Form
//  * Basic email/password form with minimal styling
//  */
// export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, error, isLoading }) => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     await onSubmit(email, password);
//   };

//   return (
//     <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '400px' }}>
//       {/* Email Input */}
//       <div style={{ marginBottom: '1rem' }}>
//         <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
//           Email
//         </label>
//         <input
//           id="email"
//           type="email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           required
//           disabled={isLoading}
//           placeholder="admin@example.com"
//           style={{
//             width: '100%',
//             padding: '0.75rem',
//             fontSize: '1rem',
//             border: '1px solid #ccc',
//             borderRadius: '4px',
//             boxSizing: 'border-box',
//           }}
//         />
//       </div>

//       {/* Password Input */}
//       <div style={{ marginBottom: '1rem' }}>
//         <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
//           Password
//         </label>
//         <input
//           id="password"
//           type="password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           required
//           disabled={isLoading}
//           placeholder="Enter your password"
//           style={{
//             width: '100%',
//             padding: '0.75rem',
//             fontSize: '1rem',
//             border: '1px solid #ccc',
//             borderRadius: '4px',
//             boxSizing: 'border-box',
//           }}
//         />
//       </div>

//       {/* Error Message */}
//       {error && (
//         <div
//           style={{
//             color: '#d32f2f',
//             marginBottom: '1rem',
//             padding: '0.75rem',
//             backgroundColor: '#ffebee',
//             borderRadius: '4px',
//             fontSize: '0.9rem',
//           }}
//         >
//           {error}
//         </div>
//       )}

//       {/* Submit Button */}
//       <button
//         type="submit"
//         disabled={isLoading}
//         style={{
//           width: '100%',
//           padding: '0.75rem',
//           fontSize: '1rem',
//           fontWeight: 500,
//           backgroundColor: isLoading ? '#90caf9' : '#1976d2',
//           color: '#fff',
//           border: 'none',
//           borderRadius: '4px',
//           cursor: isLoading ? 'not-allowed' : 'pointer',
//           transition: 'background-color 0.2s',
//         }}
//       >
//         {isLoading ? 'Signing in...' : 'Sign In'}
//       </button>
//     </form>
//   );
// };

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, error, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  const boxStyle = {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    width: '90%',
    maxWidth: '450px',
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}
    >

      {/* Box 1 — Subtitle */}
      {/* <div style={boxStyle}>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem', margin: 0 }}>
          Sign in to access the me2you admin panel
        </p>
      </div> */}

      {/* Box 2 — Email Input */}
      <div style={boxStyle}>
        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          placeholder="admin@example.com"
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Box 3 — Password Input */}
      <div style={boxStyle}>
        <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          placeholder="Enter your password"
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Box 4 — Error message (only appears if there's an error) */}
      {error && (
        <div style={{
          ...boxStyle,
          backgroundColor: '#ffebee',
          padding: '0.75rem 2rem',
        }}>
          <p style={{ color: '#d32f2f', fontSize: '0.9rem', margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      {/* Box 5 — Submit Button */}
      <div style={boxStyle}>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            fontWeight: 500,
            backgroundColor: isLoading ? '#90caf9' : '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>

    </form>
  );
};