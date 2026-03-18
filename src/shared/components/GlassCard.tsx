import React from 'react';
import styles from './GlassCard.module.css';
import logo from '@/assets/me2you.png';

interface GlassCardProps {
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children }) => {
  return (
    <div className={styles.wrapper}>

      {/* me2you watermark PNG */}
      <img src={logo} className={styles.watermark} />

      {/* glass card */}
      <div className={styles.glassCard}>
        {children}
      </div>

    </div>
  );
};
