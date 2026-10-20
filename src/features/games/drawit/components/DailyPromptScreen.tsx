import React from "react";
import { useDailyWord } from "../hooks/useDailyWord";
import { BTN_LG, BTN_PRIMARY, BTN_SECONDARY } from "../../components/gameUi";

interface Props {
  onProceed: (word: string) => void;
  onBack: () => void;
}

export const DailyPromptScreen: React.FC<Props> = ({ onProceed, onBack }) => {
  const { word } = useDailyWord();
  return (
    <div className="flex flex-col items-center gap-[30px]">
      <p className="m-0 font-jersey text-[36px] tracking-brand text-white/85 lowercase">word of the day</p>
      <h1 className="m-0 font-jersey text-[180px] leading-none tracking-brand text-lime text-shadow-pop">{word}</h1>
      <div className="mt-[30px] flex gap-6">
        <button className={`${BTN_LG} ${BTN_PRIMARY} min-w-0`} onClick={() => onProceed(word)}>
          let's draw
        </button>
        <button className={`${BTN_LG} ${BTN_SECONDARY} min-w-0`} onClick={onBack}>
          back
        </button>
      </div>
    </div>
  );
};
