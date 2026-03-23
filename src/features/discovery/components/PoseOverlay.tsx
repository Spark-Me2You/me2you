/**
 * PoseOverlay Component
 * Displays "choose a pose:" instruction banner with gesture icons
 * Always visible at the top of the discovery view
 */

import React from 'react';
import styles from './PoseOverlay.module.css';
import peaceIcon from '@/assets/peace.png';
import waveIcon from '@/assets/wave.png';
import thumbsUpIcon from '@/assets/thumbsUP.png';

export const PoseOverlay: React.FC = () => {
  return (
    <div className={styles.overlay}>
      <p className={styles.title}>choose a pose:</p>
      <div className={styles.gestureIcons}>
        <img
          src={peaceIcon}
          alt="Peace sign gesture"
          className={`${styles.gestureIcon} ${styles.peace}`}
        />
        <img
          src={waveIcon}
          alt="Wave gesture"
          className={`${styles.gestureIcon} ${styles.wave}`}
        />
        <img
          src={thumbsUpIcon}
          alt="Thumbs up gesture"
          className={`${styles.gestureIcon} ${styles.thumbsUp}`}
        />
      </div>
    </div>
  );
};
