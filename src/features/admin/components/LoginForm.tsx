import React, { useState } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
}

const fieldFont: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontWeight: 300,
  fontSize: '32px',
  color: 'white',
  letterSpacing: '5.44px',
  textTransform: 'lowercase',
};

const magentaBox: React.CSSProperties = {
  backgroundColor: '#e405ac',
  width: '663px',
  height: '144px',
  padding: '18px 22px 0 15px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
};

const whiteInput: React.CSSProperties = {
  width: '100%',
  height: '56px',
  backgroundColor: 'white',
  border: 'none',
  borderRadius: '10px',
  boxShadow: 'inset -1px -1px 4px rgba(0,0,0,0.25), inset 0px 4px 4px rgba(0,0,0,0.25)',
  fontSize: '20px',
  padding: '0 12px',
  boxSizing: 'border-box',
  outline: 'none',
  marginTop: '6px',
};

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, error, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}
    >

      {/* Email field */}
      <div style={{ ...magentaBox, marginLeft: '426px', marginTop: '94px' }}>
        <span style={fieldFont}>email:</span>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          style={whiteInput}
        />
      </div>

      {/* Password field */}
      <div style={{ ...magentaBox, marginLeft: '337px', marginTop: '28px' }}>
        <span style={fieldFont}>password:</span>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          style={whiteInput}
        />
      </div>

      {/* Error message */}
      {error && (
        <div style={{ marginLeft: '337px', marginTop: '16px', color: 'white', backgroundColor: '#b0003a', padding: '10px 16px', borderRadius: '8px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '20px', letterSpacing: '2px' }}>
          {error}
        </div>
      )}

      {/* Submit button */}
      <div style={{ marginLeft: '426px', marginTop: '32px' }}>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? '#b0006a' : '#e405ac',
            color: 'white',
            border: 'none',
            padding: '14px 48px',
            fontSize: '28px',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 300,
            letterSpacing: '5px',
            textTransform: 'lowercase',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            borderRadius: '6px',
          }}
        >
          {isLoading ? 'signing in...' : 'sign in'}
        </button>
      </div>

    </form>
  );
};
