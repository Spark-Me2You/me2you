/**
 * SignUpStep Component — Figma "create account" screen
 */

import React, { useState } from 'react';
import shanwImg from '../../../assets/shanw.png';

// Compact orange "next →" pill, right-aligned,, same orange as the "create account" box.
const NEXT_PILL =
  "mt-4 ml-auto flex w-fit cursor-pointer items-center justify-center gap-2 rounded-[14px] border-0 bg-orange px-5 py-2 font-jersey text-[26px] leading-none tracking-brand text-white lowercase shadow-[0_4px_0_var(--color-orange-dark)] transition-[transform,box-shadow,background-color] duration-100 hover:enabled:bg-orange-dark active:enabled:translate-y-[3px] active:enabled:shadow-[0_1px_0_var(--color-orange-dark)] disabled:cursor-not-allowed disabled:opacity-60";
const FIELD_BLOCK = 'mb-[18px] flex flex-col items-start';
const FIELD_LABEL =
  'mb-2 inline-block self-start rounded-[12px] border-2 border-solid border-current px-[14px] py-[6px] font-jersey text-[20px] font-normal tracking-[1px] lowercase';
const FIELD_INPUT =
  "box-border min-h-[44px] w-full rounded-[12px] border-2 border-solid border-[rgba(0,0,0,0.12)] bg-[rgba(255,255,255,0.9)] px-[14px] py-3 font-jersey text-[20px] tracking-[1px] text-[#111] focus:border-[#e44805] focus:outline-none";

interface SignUpStepProps {
  onSubmit: (email: string, password: string) => Promise<boolean>;
  isSubmitting: boolean;
  error: string | null;
  onClearError: () => void;
}

export const SignUpStep: React.FC<SignUpStepProps> = ({
  onSubmit,
  isSubmitting,
  error,
  onClearError,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    setLocalError(null);
    onClearError();

    if (!email.trim()) {
      setLocalError('email is required');
      return false;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setLocalError('please enter a valid email address');
      return false;
    }
    if (!password) {
      setLocalError('password is required');
      return false;
    }
    if (password.length < 6) {
      setLocalError('password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setLocalError('passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    await onSubmit(email.trim(), password);
  };

  const displayError = localError || error;

  return (
    <div className="flex min-h-dvh flex-col items-center px-6 pt-[130px] pb-10">
      <div className="w-full max-w-[350px] rounded-[24px] bg-glass px-[26px] pt-[30px] pb-9 shadow-glass backdrop-brightness-98 backdrop-hue-rotate-10 backdrop-saturate-105">
        <div className="relative mx-auto mb-6 block w-fit rounded-[14px] bg-[#e44805] px-8 py-[14px]">
          <p className="m-0 font-jersey text-[36px] leading-none tracking-[3px] text-white lowercase">create account</p>
          {/* Shawn's figure sits in the lower right of a mostly transparent image;
              these offsets stand him in the open space at the box's right end. */}
          <img src={shanwImg} alt="" className="pointer-events-none absolute -right-[90px] -bottom-[80px] z-[5] h-auto w-[400px] rotate-[8deg] select-none" />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {displayError && (
            <div className="mb-[14px] rounded-[12px] border-2 border-solid border-[rgba(183,28,28,0.5)] bg-[rgba(183,28,28,0.1)] px-[14px] py-2 font-jersey text-[18px] tracking-[1px] text-[#b71c1c] lowercase">{displayError}</div>
          )}

          <div className={FIELD_BLOCK}>
            <label
              htmlFor="su-email"
              className={`${FIELD_LABEL} text-[#2e7d32] bg-[rgba(46,125,50,0.1)]`}
            >
              email:
            </label>
            <input
              id="su-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD_INPUT}
              placeholder="type here"
              disabled={isSubmitting}
              autoComplete="email"
              autoCapitalize="none"
            />
          </div>

          <div className={FIELD_BLOCK}>
            <label
              htmlFor="su-password"
              className={`${FIELD_LABEL} text-[#1e88e5] bg-[rgba(30,136,229,0.1)]`}
            >
              password:
            </label>
            <input
              id="su-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={FIELD_INPUT}
              placeholder="type here"
              disabled={isSubmitting}
              autoComplete="new-password"
            />
          </div>

          <div className={FIELD_BLOCK}>
            <label
              htmlFor="su-confirm"
              className={`${FIELD_LABEL} text-[#e91e63] bg-[rgba(233,30,99,0.1)]`}
            >
              confirm password:
            </label>
            <input
              id="su-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={FIELD_INPUT}
              placeholder="type here"
              disabled={isSubmitting}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className={NEXT_PILL} disabled={isSubmitting}>
            {isSubmitting ? "creating..." : "next"}
            <span aria-hidden="true" className="text-[28px] leading-none">→</span>
          </button>
        </form>
      </div>
    </div>
  );
};
