import React from "react";
import styles from "./ExitButton.module.css";

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
  return (
    <button
      type="button"
      className={`${styles.exitButton} ${compact ? styles.compact : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};
