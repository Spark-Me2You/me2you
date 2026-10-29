/**
 * PoseOverlay Component
 * Displays "choose a pose:" instruction banner with gesture icons
 * Always visible at the top of the discovery view
 */

import React from 'react';
import peaceIcon from '@/assets/peace.png';
import waveIcon from '@/assets/wave.png';
import thumbsUpIcon from '@/assets/thumbsUP.png';

export const PoseOverlay: React.FC = () => {
  return (
    <div className="absolute inset-x-[20%] top-0 z-50 flex h-32 items-center gap-10 rounded-glass bg-purple/57 px-[35px] shadow-glass-card backdrop-blur-[4px]">
      <p className="m-0 font-averia text-[53px] font-normal tracking-brand whitespace-nowrap text-white">choose a pose:</p>
      <div className="flex flex-1 items-center justify-center gap-5">
        <img
          src={peaceIcon}
          alt="Peace sign gesture"
          className="h-[7.8rem] w-auto object-contain [filter:drop-shadow(0px_2px_4px_rgba(0,0,0,0.2))] [transform:rotate(38.55deg)_translateY(0.8rem)]"
        />
        <img
          src={waveIcon}
          alt="Wave gesture"
          className="h-[7.8rem] w-auto object-contain [filter:drop-shadow(0px_2px_4px_rgba(0,0,0,0.2))] [transform:translateY(0.8rem)]"
        />
        <img
          src={thumbsUpIcon}
          alt="Thumbs up gesture"
          className="h-28 w-auto object-contain [filter:drop-shadow(0px_2px_4px_rgba(0,0,0,0.2))] [transform:translateY(0.4rem)]"
        />
      </div>
    </div>
  );
};
