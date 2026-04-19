import React from "react";
import styles from "./DrawItMenu.module.css";

interface Props {
  onStart: () => void;
  onGallery: () => void;
  onBack: () => void;
}

export const DrawItMenu: React.FC<Props> = ({ onStart, onGallery, onBack }) => (
  <div className={styles.container}>
    <h1 className={styles.title}>DrawIt</h1>
    <div className={styles.buttons}>
      <button className={styles.primary} onClick={onStart}>
        Start Drawing
      </button>
      <button className={styles.secondary} onClick={onGallery}>
        View Gallery
      </button>
      <button className={styles.secondary} onClick={onBack}>
        Back
      </button>
    </div>
  </div>
);
