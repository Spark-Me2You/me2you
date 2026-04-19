import React from "react";
import styles from "./ConfirmModal.module.css";

interface Props {
  message: string;
  onYes: () => void;
  onNo: () => void;
}

export const ConfirmModal: React.FC<Props> = ({ message, onYes, onNo }) => (
  <div className={styles.backdrop}>
    <div className={styles.panel}>
      <p className={styles.message}>{message}</p>
      <div className={styles.buttons}>
        <button type="button" className={styles.yes} onClick={onYes}>
          Yes
        </button>
        <button type="button" className={styles.no} onClick={onNo}>
          No
        </button>
      </div>
    </div>
  </div>
);
