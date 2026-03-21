import React, { useState } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
}

const fieldFont: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontWeight: 300,
  fontSize: '24px',
  color: 'white',
  letterSpacing: '4px',
  textTransform: 'lowercase',
  textAlign: 'left',
};

const magentaBox: React.CSSProperties = {
  backgroundColor: '#e405ac',
  width: '490px',
  height: '106px',
  padding: '13px 16px 0 11px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  alignItems: 'flex-start',
};

const whiteInput: React.CSSProperties = {
  width: '100%',
  height: '42px',
  backgroundColor: 'white',
  border: 'none',
  borderRadius: '8px',
  boxShadow: 'inset -1px -1px 4px rgba(0,0,0,0.25), inset 0px 4px 4px rgba(0,0,0,0.25)',
  fontSize: '15px',
  padding: '0 10px',
  boxSizing: 'border-box',
  outline: 'none',
  marginTop: '4px',
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
      <div style={{ ...magentaBox, marginLeft: '350px', marginTop: '100px' }}>
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
      <div style={{ ...magentaBox, marginLeft: '350px', marginTop: '20px' }}>
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
        <div style={{ marginLeft: '350px', marginTop: '12px', color: 'white', backgroundColor: '#b0003a', padding: '8px 14px', borderRadius: '0px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '16px', letterSpacing: '2px' }}>
          {error}
        </div>
      )}

      {/* Submit button */}
      <div style={{ marginLeft: '525px', marginTop: '24px' }}>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? '#b0006a' : '#e405ac',
            color: 'white',
            border: 'none',
            padding: '10px 36px',
            fontSize: '21px',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 300,
            letterSpacing: '4px',
            textTransform: 'lowercase',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            borderRadius: '0px',
          }}
        >
          {isLoading ? 'signing in...' : 'sign in'}
        </button>
      </div>

    </form>
  );
};
