import React from "react";
import { PinnedRegistrationQR } from "@/features/kiosk";

interface Props {
  onStart: () => void;
  onGallery: () => void;
  onBack: () => void;
}

export const DrawItMenu: React.FC<Props> = ({ onStart, onGallery, onBack }) => (
  <div className="flex flex-col items-center gap-[60px]">
    <h1 className="m-0 font-jersey text-[160px] tracking-[8px] text-white [text-shadow:4px_4px_0_rgba(0,0,0,0.4)]">DrawIt</h1>
    <div className="flex flex-col items-center gap-6">
      <button className="cursor-pointer rounded-[14px] border-4 border-solid border-white px-[60px] py-5 font-jersey text-[42px] tracking-[4px] [transition:transform_120ms_ease] hover:[transform:scale(1.05)] bg-white text-[#008080]" onClick={onStart}>
        Start Drawing
      </button>
      <button className="cursor-pointer rounded-[14px] border-4 border-solid border-white px-[60px] py-5 font-jersey text-[42px] tracking-[4px] [transition:transform_120ms_ease] hover:[transform:scale(1.05)] bg-transparent text-white" onClick={onGallery}>
        View Gallery
      </button>
      <button className="cursor-pointer rounded-[14px] border-4 border-solid border-white px-[60px] py-5 font-jersey text-[42px] tracking-[4px] [transition:transform_120ms_ease] hover:[transform:scale(1.05)] bg-transparent text-white" onClick={onBack}>
        Back
      </button>
    </div>
    <PinnedRegistrationQR side="right" top={145} qrSize={150} />
  </div>
);
