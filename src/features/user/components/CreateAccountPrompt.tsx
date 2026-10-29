/**
 * Create Account Prompt
 * Instructions for users to visit a kiosk and scan QR code
 */


interface CreateAccountPromptProps {
  onClose: () => void;
}

export const CreateAccountPrompt: React.FC<CreateAccountPromptProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-5 backdrop-blur-[4px]" onClick={onClose}>
      <div className="w-full max-w-[400px] rounded-[24px] bg-[linear-gradient(to_bottom,#58e7f7_0%,#fefffb_100%)] px-[30px] py-10 shadow-[0px_8px_24px_rgba(0,0,0,0.3)]" onClick={(e) => e.stopPropagation()}>
        <h2 className="m-0 mb-6 text-center font-jersey text-[42px] tracking-[3px] text-[#e44805] lowercase">create account</h2>

        <div className="mb-6 rounded-[16px] p-6 bg-glass backdrop-brightness-98 backdrop-hue-rotate-10 backdrop-saturate-105 shadow-glass">
          <p className="m-0 mb-6 text-center font-jersey text-[22px] leading-[1.5] text-[#333]">
            To create an account, visit a SPARK Space kiosk and scan the QR code displayed on screen.
          </p>

          <div className="mb-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e44805] font-jersey text-[24px] text-white">1</span>
              <span className="pt-1 font-jersey text-[20px] leading-[1.8] text-[#333]">Visit a SPARK Space kiosk</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e44805] font-jersey text-[24px] text-white">2</span>
              <span className="pt-1 font-jersey text-[20px] leading-[1.8] text-[#333]">Scan the QR code on the kiosk screen</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e44805] font-jersey text-[24px] text-white">3</span>
              <span className="pt-1 font-jersey text-[20px] leading-[1.8] text-[#333]">Complete your profile on your phone</span>
            </div>
          </div>

          <p className="m-0 border-t border-solid border-t-[rgba(0,0,0,0.1)] pt-4 text-center font-jersey text-[18px] text-[#666] italic">
            After creating your account, you can sign in here to view your profile anytime.
          </p>
        </div>

        <button onClick={onClose} className="w-full cursor-pointer rounded-[16px] border-0 bg-[#e44805] p-[14px] font-jersey text-[24px] tracking-[2px] text-white lowercase [transition:background_0.2s,transform_0.1s] hover:bg-[#cc4004] active:[transform:scale(0.98)]">
          back to sign in
        </button>
      </div>
    </div>
  );
};
