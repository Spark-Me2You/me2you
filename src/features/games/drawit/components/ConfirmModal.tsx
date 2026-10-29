import React from "react";

interface Props {
  message: string;
  onYes: () => void;
  onNo: () => void;
}

export const ConfirmModal: React.FC<Props> = ({ message, onYes, onNo }) => (
  <div className="fixed inset-0 z-[10500] flex items-center justify-center bg-[rgba(0,0,0,0.55)] font-jersey">
    <div className="min-w-[380px] border-4 border-solid border-[#fff] border-r-[#404040] border-b-[#404040] bg-[#c0c0c0] px-12 py-9 text-center shadow-[6px_6px_0_#000]">
      <p className="m-0 mb-[30px] text-[38px] tracking-[3px] text-[#101010]">{message}</p>
      <div className="flex justify-center gap-5">
        <button type="button" className="min-w-[130px] cursor-pointer border-[3px] border-solid border-[#fff] border-r-[#404040] border-b-[#404040] bg-[#ff4040] px-10 py-[14px] font-jersey text-[30px] tracking-[4px] text-white [transition:transform_80ms_ease,background_80ms_ease] hover:bg-[#ff5a5a] hover:[transform:scale(1.04)]" onClick={onYes}>
          Yes
        </button>
        <button type="button" className="min-w-[130px] cursor-pointer border-[3px] border-solid border-[#fff] border-r-[#404040] border-b-[#404040] bg-[#dcdcdc] px-10 py-[14px] font-jersey text-[30px] tracking-[4px] text-[#101010] [transition:transform_80ms_ease,background_80ms_ease] hover:bg-[#e8e8e8] hover:[transform:scale(1.04)]" onClick={onNo}>
          No
        </button>
      </div>
    </div>
  </div>
);
