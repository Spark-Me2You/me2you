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
    ? "h-[60px] w-[140px] rounded-tag text-[22px]"
    : "h-[81px] w-[183px] rounded-btn text-[28px]";

  return (
    <button
      type="button"
      className={`absolute top-4 left-4 z-100 flex cursor-pointer items-center justify-center border border-sky bg-action-exit font-averia font-bold tracking-[0.1em] text-white shadow-drop ${size}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};
