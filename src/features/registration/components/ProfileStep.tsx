/**
 * ProfileStep Component — Figma "profile-creation" screen
 */

import React, { useState, useEffect } from 'react';
import { GoBackWarning } from './GoBackWarning';
import pinkBackArrowImg from '../../../assets/pink_back_arrow.svg';
import nextButtonImg from '../../../assets/next_button.svg';
import type { RegistrationFormData } from '../services/registrationService';

const FIELD_GROUP = 'mb-7 flex flex-col items-start';
const FIELD_LABEL =
  'mx-0 mt-0 mb-2 inline-block bg-[#1405e4] px-[10px] py-[2px] font-jersey text-[28px] leading-[1.1] tracking-[5.44px] text-white';
const FIELD_INPUT =
  "box-border min-h-[34px] w-full rounded-[10px] border-0 bg-white px-3 py-2 font-['Andale_Mono','Courier_New',monospace] text-[12px] tracking-[-0.48px] text-black shadow-[inset_-1px_-1px_4px_0px_rgba(0,0,0,0.25),inset_0px_4px_4px_0px_rgba(0,0,0,0.25)] focus:outline-2 focus:outline-offset-[-2px] focus:outline-[#d3e405]";
const NEXT_IMG = 'block h-[51px] w-[55px]';

interface ProfileStepProps {
  formData: Partial<RegistrationFormData>;
  onUpdateFormData: (data: Partial<RegistrationFormData>) => void;
  onSubmit: () => Promise<boolean>;
  onBack: () => void;
  isSubmitting: boolean;
  error: string | null;
  onClearError: () => void;
}

export const ProfileStep: React.FC<ProfileStepProps> = ({
  formData,
  onUpdateFormData,
  onSubmit,
  onBack,
  isSubmitting,
  error,
  onClearError,
}) => {
  const [name, setName] = useState(formData.name || '');
  const [pronouns, setPronouns] = useState(formData.pronouns || '');
  const [major, setMajor] = useState(formData.major || '');
  const [status, setStatus] = useState(formData.status || '');
  const [interests, setInterests] = useState(formData.interests?.join(', ') || '');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    onUpdateFormData({
      name,
      pronouns: pronouns || undefined,
      major: major || undefined,
      status: status || undefined,
      interests: interests
        ? interests
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    });
  }, [name, pronouns, major, status, interests, onUpdateFormData]);

  const validateForm = (): boolean => {
    setLocalError(null);
    onClearError();
    if (!name.trim()) {
      setLocalError('name is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    await onSubmit();
  };

  const handleGoBack = () => setShowWarning(true);
  const handleConfirmGoBack = () => { setShowWarning(false); onBack(); };
  const handleCancelGoBack = () => setShowWarning(false);

  const displayError = localError || error;

  return (
    <>
      <div className="relative flex min-h-screen flex-col pt-[130px]">
        <div className="mt-0 mr-0 mb-2 ml-[10px] inline-block bg-magenta px-[18px] py-2">
          <p className="m-0 font-averia text-[18px] font-normal tracking-[3px] text-white">profile creation</p>
        </div>

        <div className="-mx-[10px] flex-1 rounded-[46px] bg-glass px-5 pt-6 pb-10 shadow-glass-card">
          <form onSubmit={handleSubmit} noValidate>
            {displayError && (
              <div className="mb-[14px] rounded-[10px] border border-solid border-[rgba(255,60,60,0.35)] bg-[rgba(255,60,60,0.12)] px-[14px] py-2 font-averia text-[14px] tracking-[0.5px] text-[#b00]">{displayError}</div>
            )}

            <div className={FIELD_GROUP}>
              <label htmlFor="pf-name" className={FIELD_LABEL}>name:</label>
              <input
                id="pf-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={FIELD_INPUT}
                placeholder="type here"
                disabled={isSubmitting}
                autoCapitalize="words"
              />
            </div>

            <div className={FIELD_GROUP}>
              <label htmlFor="pf-pronouns" className={FIELD_LABEL}>pronouns:</label>
              <input
                id="pf-pronouns"
                type="text"
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                className={FIELD_INPUT}
                placeholder="type here"
                disabled={isSubmitting}
              />
            </div>

            <div className={FIELD_GROUP}>
              <label htmlFor="pf-major" className={FIELD_LABEL}>major/title:</label>
              <input
                id="pf-major"
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                className={FIELD_INPUT}
                placeholder="type here"
                disabled={isSubmitting}
              />
            </div>

            {/* bio maps to status field */}
            <div className={FIELD_GROUP}>
              <label htmlFor="pf-bio" className={FIELD_LABEL}>bio:</label>
              <textarea
                id="pf-bio"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`${FIELD_INPUT} min-h-[100px] resize-none`}
                placeholder="type here"
                disabled={isSubmitting}
                rows={4}
              />
            </div>

            <div className={FIELD_GROUP}>
              <label htmlFor="pf-interests" className={FIELD_LABEL}>interests:</label>
              <textarea
                id="pf-interests"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className={`${FIELD_INPUT} min-h-[100px] resize-none`}
                placeholder="type here"
                disabled={isSubmitting}
                rows={4}
              />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                className="flex cursor-pointer appearance-none items-center justify-center border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={handleGoBack}
                disabled={isSubmitting}
                aria-label="go back"
              >
                <img src={pinkBackArrowImg} alt="back" className={NEXT_IMG} />
              </button>

              <button
                type="submit"
                className="flex cursor-pointer appearance-none flex-col items-center gap-1 border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
              >
                <img src={nextButtonImg} alt="next" className={NEXT_IMG} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {showWarning && (
        <GoBackWarning
          onConfirm={handleConfirmGoBack}
          onCancel={handleCancelGoBack}
        />
      )}
    </>
  );
};
