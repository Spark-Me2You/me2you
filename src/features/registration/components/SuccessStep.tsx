/**
 * SuccessStep Component
 * Registration completion confirmation
 */

import React from 'react';
import styles from './RegistrationSteps.module.css';

interface SuccessStepProps {
  userName?: string;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({ userName }) => {
  return (
    <div className={styles.stepContainer}>
      <div className={styles.successContainer}>
        <div className={styles.successIcon}>
          ✓
        </div>

        <h2 className={styles.successTitle}>
          Welcome{userName ? `, ${userName}` : ''}!
        </h2>

        <p className={styles.successMessage}>
          Your me2you profile has been created successfully.
          <br /><br />
          Head to the SPARK Space kiosk to start connecting with others!
        </p>
      </div>
    </div>
  );
};
