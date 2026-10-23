/**
 * GoBackWarning Component
 * Overlay warning shown when user tries to go back during profile creation
 */

import React from 'react';
import pinkBackArrow from '../../../assets/pink_back_arrow.svg';

interface GoBackWarningProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const GoBackWarning: React.FC<GoBackWarningProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(255,255,255,0.65)] px-4 backdrop-blur-[3px]">
      <div className="w-full max-w-[380px] rounded-[46px] bg-lime/93 px-7 pt-[44px] pb-9 shadow-glass-card">
        <p className="m-0 mb-[22px] font-averia text-[36px] leading-[1.15] font-normal tracking-[6.12px] text-white">are you sure you want to go back?</p>
        <ul className="m-0 mb-8 pl-6 font-averia text-[20px] leading-[1.45] font-normal tracking-[3.4px] text-white italic [&>li]:mb-[14px]">
          <li>you'll lose all of your progress......</li>
          <li>your account won't be created until you submit a profile...</li>
        </ul>
        <div className="flex items-start justify-between gap-2">
          <button className="flex flex-1 cursor-pointer flex-col items-center gap-[6px] border-0 bg-transparent p-0" onClick={onConfirm}>
            <img src={pinkBackArrow} alt="" className="w-[88px] rotate-[4.71deg]" />
            <span className="text-center font-jersey text-[17px] leading-[1.25] tracking-[2.89px] text-black">
              <u>YES</u>, go back please
            </span>
          </button>
          <button className="flex flex-1 cursor-pointer flex-col items-center gap-[6px] border-0 bg-transparent p-0" onClick={onCancel}>
            <img src={pinkBackArrow} alt="" className="w-[88px] [transform:scaleX(-1)_rotate(-4.71deg)]" />
            <span className="text-center font-jersey text-[17px] leading-[1.25] tracking-[2.89px] text-black">
              <u>nevermind, keep going!</u>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
