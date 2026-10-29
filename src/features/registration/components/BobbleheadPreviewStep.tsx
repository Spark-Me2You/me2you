/**
 * BobbleheadPreviewStep Component
 * Shows cropped head preview and asks user to opt-in to network.
 */

import React from 'react';
import nextButtonImg from '../../../assets/next_button.svg';
import pinkBackArrowImg from '../../../assets/pink_back_arrow.svg';
import shanwImg from '../../../assets/shanw.png';

export interface BobbleheadPreviewStepProps {
  croppedPhotoUrl: string;
  onSubmit: (joinNetwork: boolean) => Promise<boolean>;
  onRetake: () => void;
  isSubmitting: boolean;
  error: string | null;
  onClearError: () => void;
}

export const BobbleheadPreviewStep: React.FC<BobbleheadPreviewStepProps> = ({
  croppedPhotoUrl,
  onSubmit,
  onRetake,
  isSubmitting,
  error,
  onClearError,
}) => {
  const handleYes = async () => {
    onClearError();
    await onSubmit(true);
  };

  const handleNo = async () => {
    onClearError();
    await onSubmit(false);
  };

  return (
    <div className="flex min-h-screen flex-col pt-[112px]">
      <div className="relative -mx-[10px] flex flex-col items-center rounded-[46px] bg-glass pt-[30px] pr-[26px] pb-[44px] pl-[30px] shadow-glass-card">
        {error && (
          <div className="mb-[14px] rounded-[10px] border border-solid border-[rgba(255,60,60,0.35)] bg-[rgba(255,60,60,0.12)] px-[14px] py-2 font-averia text-[14px] tracking-[0.5px] text-[#b00]">{error}</div>
        )}

        {/* Preview area with checkered background */}
        <div className="mb-6 w-full max-w-[320px]">
          <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-[linear-gradient(45deg,#ccc_25%,transparent_25%),linear-gradient(-45deg,#ccc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ccc_75%),linear-gradient(-45deg,transparent_75%,#ccc_75%)] [background-position:0_0,0_10px,10px_-10px,-10px_0] [background-size:20px_20px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25),inset_0px_0px_4px_0px_rgba(0,0,0,0.25)]">
            <img
              src={croppedPhotoUrl}
              alt="Your bobblehead"
              className="block h-full w-full object-contain"
            />
          </div>
        </div>

        {/* Shanw decorative character — absolute positioned */}
        <img src={shanwImg} alt="" className="absolute right-[-80px] bottom-[205px] w-[44px] origin-bottom-right [transform:scale(10)_rotate(3.14deg)]" />

        {/* Blue box question */}
        <div className="mx-0 mt-2 mb-6 box-border w-full bg-[#1405e4] px-4 py-[14px]">
          <p className="m-0 text-center font-averia text-[20px] leading-[1.3] font-normal tracking-[2.5px] text-white">
            would you like to be added to our network?
          </p>
        </div>

        {/* Action buttons: pink (no thanks, left) + lime (yes, right) */}
        <div className="mb-5 flex w-full max-w-[320px] items-start justify-between gap-4">
          <button
            type="button"
            className="flex cursor-pointer flex-col items-center gap-[6px] border-0 bg-transparent px-4 py-2 text-center font-jersey text-[20px] leading-[1.2] tracking-[3.4px] text-black flex-1 disabled:cursor-not-allowed disabled:opacity-35"
            onClick={handleNo}
            disabled={isSubmitting}
          >
            <img src={pinkBackArrowImg} alt="" className="w-[64px] rotate-[5deg]" />
            <span className="text-center font-averia text-[16px] tracking-[2px] text-black">no thanks</span>
          </button>

          <button
            type="button"
            className="flex cursor-pointer flex-col items-center gap-[6px] border-0 bg-transparent px-4 py-2 text-center font-jersey text-[20px] leading-[1.2] tracking-[3.4px] text-black flex-1 disabled:cursor-not-allowed disabled:opacity-35"
            onClick={handleYes}
            disabled={isSubmitting}
          >
            <img src={nextButtonImg} alt="" className="w-[64px] rotate-[5deg]" />
            <span className="text-center font-averia text-[16px] tracking-[2px] text-black">YES!</span>
          </button>
        </div>

        {/* Retake link */}
        <button
          type="button"
          className="cursor-pointer border-0 bg-transparent px-4 py-2 font-jersey text-[18px] tracking-[2.5px] text-[#666] underline disabled:cursor-not-allowed disabled:opacity-35"
          onClick={onRetake}
          disabled={isSubmitting}
        >
          retake photo
        </button>
      </div>
    </div>
  );
};
