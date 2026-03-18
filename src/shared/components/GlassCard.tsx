import React from 'react';
import styles from './GlassCard.module.css';
import logo from '@/assets/me2you.png';

interface GlassCardProps {
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children }) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.glassCard}>
        <img src={logo} className={styles.watermark} alt="" />
        {children}
      </div>
    </div>
  );
};
