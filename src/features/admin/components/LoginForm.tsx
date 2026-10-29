import React, { useState } from 'react';

const FIELD_BOX =
  'box-border flex h-[106px] w-[490px] flex-col items-start justify-start bg-magenta pt-[13px] pr-4 pb-0 pl-[11px]';
const FIELD_LABEL =
  'text-left font-averia text-[24px] font-light tracking-[4px] text-white lowercase';
const FIELD_INPUT =
  'mt-1 box-border h-[42px] w-full rounded-[8px] border-0 bg-white px-[10px] py-0 text-[15px] shadow-[inset_-1px_-1px_4px_rgba(0,0,0,0.25),inset_0px_4px_4px_rgba(0,0,0,0.25)] outline-none';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, error, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  return (
    <form className="flex w-full flex-col items-start" onSubmit={handleSubmit}>

      {/* Email field */}
      <div className={`${FIELD_BOX} mt-[100px] ml-[350px]`}>
        <span className={FIELD_LABEL}>email:</span>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          className={FIELD_INPUT}
        />
      </div>

      {/* Password field */}
      <div className={`${FIELD_BOX} mt-5 ml-[350px]`}>
        <span className={FIELD_LABEL}>password:</span>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          className={FIELD_INPUT}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 ml-[350px] bg-error px-[14px] py-2 font-averia text-[16px] tracking-[2px] text-white">{error}</div>
      )}

      {/* Submit button */}
      <div className="mt-6 ml-[525px]">
        <button
          type="submit"
          disabled={isLoading}
          className={`rounded-none border-0 px-9 py-2.5 font-averia text-[21px] font-light tracking-[4px] text-white lowercase ${
            isLoading ? 'cursor-not-allowed bg-magenta-dim' : 'cursor-pointer bg-magenta'
          }`}
        >
          {isLoading ? 'signing in...' : 'sign in'}
        </button>
      </div>

    </form>
  );
};
