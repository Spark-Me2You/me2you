import React from "react";

interface Props {
  message: string;
  onYes: () => void;
  onNo: () => void;
}

const BTN =
  "min-w-[130px] cursor-pointer rounded-tag px-10 py-[14px] font-jersey text-[30px] tracking-brand lowercase shadow-drop transition-transform duration-80 ease-out hover:scale-104";

export const ConfirmModal: React.FC<Props> = ({ message, onYes, onNo }) => (
  <div className="animate-fade-in-fast fixed inset-0 z-[10500] flex items-center justify-center bg-scrim font-jersey">
    <div className="animate-pop-in min-w-[380px] rounded-glass bg-cream px-12 py-9 text-center shadow-glass-card">
      <p className="m-0 mb-[30px] text-[38px] tracking-brand text-ink lowercase">{message}</p>
      <div className="flex justify-center gap-5">
        <button type="button" className={`${BTN} bg-action-exit text-white`} onClick={onYes}>
          yes
        </button>
        <button type="button" className={`${BTN} border-2 border-solid border-ink/15 bg-white text-ink`} onClick={onNo}>
          no
        </button>
      </div>
    </div>
  </div>
);
