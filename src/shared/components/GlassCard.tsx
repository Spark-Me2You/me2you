import React from 'react';
import logo from '@/assets/me2you.png';

interface GlassCardProps {
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children }) => {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <img
        src={logo}
        className="pointer-events-none absolute top-[15px] left-1/2 z-2 h-[196px] w-[520px] -translate-x-1/2 rotate-[3.41deg]"
        alt=""
      />
      <div className="absolute top-[120px] left-1/2 min-h-[820px] w-[90vw] max-w-[1200px] -translate-x-1/2 rounded-[34px] bg-glass backdrop-brightness-98 backdrop-hue-rotate-10 backdrop-saturate-105 shadow-glass">
        {children}
      </div>
    </div>
  );
};
