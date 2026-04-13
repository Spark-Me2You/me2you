/**
 * GoBackWarning Component
 * Overlay warning shown when user tries to go back during profile creation
 */

import React from 'react';
import styles from './RegistrationSteps.module.css';
import pinkBackArrow from '../../../assets/pink_back_arrow.svg';

interface GoBackWarningProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const GoBackWarning: React.FC<GoBackWarningProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className={styles.warningOverlay}>
      <div className={styles.warningCard}>
        <p className={styles.warningTitle}>are you sure you want to go back?</p>
        <ul className={styles.warningList}>
          <li>you'll lose all of your progress......</li>
          <li>your account won't be created until you submit a profile...</li>
        </ul>
        <div className={styles.warningBtns}>
          <button className={styles.warningBtnYes} onClick={onConfirm}>
            <img src={pinkBackArrow} alt="" className={styles.warningFingerLeft} />
            <span className={styles.warningBtnText}>
              <u>YES</u>, go back please
            </span>
          </button>
          <button className={styles.warningBtnNo} onClick={onCancel}>
            <img src={pinkBackArrow} alt="" className={styles.warningFingerRight} />
            <span className={styles.warningBtnText}>
              <u>nevermind, keep going!</u>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
