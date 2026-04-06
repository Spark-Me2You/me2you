/**
 * Create Account Prompt
 * Instructions for users to visit a kiosk and scan QR code
 */

import styles from './CreateAccountPrompt.module.css';

interface CreateAccountPromptProps {
  onClose: () => void;
}

export const CreateAccountPrompt: React.FC<CreateAccountPromptProps> = ({ onClose }) => {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>create account</h2>

        <div className={styles.content}>
          <p className={styles.message}>
            To create an account, visit a SPARK Space kiosk and scan the QR code displayed on screen.
          </p>

          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <span className={styles.stepText}>Visit a SPARK Space kiosk</span>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepText}>Scan the QR code on the kiosk screen</span>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <span className={styles.stepText}>Complete your profile on your phone</span>
            </div>
          </div>

          <p className={styles.note}>
            After creating your account, you can sign in here to view your profile anytime.
          </p>
        </div>

        <button onClick={onClose} className={styles.closeButton}>
          back to sign in
        </button>
      </div>
    </div>
  );
};
