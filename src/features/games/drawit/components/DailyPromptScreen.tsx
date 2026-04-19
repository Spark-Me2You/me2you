import React from "react";
import { useDailyWord } from "../hooks/useDailyWord";
import styles from "./DailyPromptScreen.module.css";

interface Props {
  onProceed: (word: string) => void;
  onBack: () => void;
}

export const DailyPromptScreen: React.FC<Props> = ({ onProceed, onBack }) => {
  const { word } = useDailyWord();
  return (
    <div className={styles.container}>
      <p className={styles.label}>Word of the Day</p>
      <h1 className={styles.word}>{word}</h1>
      <div className={styles.buttons}>
        <button className={styles.primary} onClick={() => onProceed(word)}>
          Proceed
        </button>
        <button className={styles.secondary} onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
};
