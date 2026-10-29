import React from "react";
import { useDailyWord } from "../hooks/useDailyWord";

interface Props {
  onProceed: (word: string) => void;
  onBack: () => void;
}

export const DailyPromptScreen: React.FC<Props> = ({ onProceed, onBack }) => {
  const { word } = useDailyWord();
  return (
    <div className="flex flex-col items-center gap-[30px]">
      <p className="m-0 font-jersey text-[36px] tracking-[6px] text-[rgba(255,255,255,0.85)] uppercase">Word of the Day</p>
      <h1 className="m-0 font-jersey text-[180px] tracking-[6px] text-[#ff0] [text-shadow:5px_5px_0_rgba(0,0,0,0.4)]">{word}</h1>
      <div className="mt-[30px] flex gap-6">
        <button className="cursor-pointer border-4 border-solid font-jersey tracking-[4px] rounded-[12px] border-white bg-white px-[50px] py-[18px] text-[36px] text-[#008080]" onClick={() => onProceed(word)}>
          Proceed
        </button>
        <button className="cursor-pointer border-4 border-solid font-jersey tracking-[4px] rounded-[12px] border-white bg-transparent px-[50px] py-[18px] text-[36px] text-white" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
};
