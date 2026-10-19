import React from "react";

interface ExitButtonProps {
  onClick: () => void;
  label?: string;
  compact?: boolean;
}

export const ExitButton: React.FC<ExitButtonProps> = ({
  onClick,
  label = "exit",
  compact = false,
}) => {
  const size = compact
    ? "h-[60px] w-[140px] rounded-[10px] text-[22px]"
    : "h-[81px] w-[183px] rounded-[13px] text-[28px]";

  return (
    <button
      type="button"
      className={`absolute top-4 left-4 z-100 flex cursor-pointer items-center justify-center border border-[#58e7f7] bg-[#f00] font-averia font-bold tracking-[0.1em] text-white shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] ${size}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};
