import React from "react";
import styles from "./ExitButton.module.css";

interface ExitButtonProps {
  onClick: () => void;
  label?: string;
}

export const ExitButton: React.FC<ExitButtonProps> = ({
  onClick,
  label = "exit",
}) => {
  return (
    <button type="button" className={styles.exitButton} onClick={onClick}>
      {label}
    </button>
  );
};
