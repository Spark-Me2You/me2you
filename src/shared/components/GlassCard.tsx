import React from 'react';
import styles from './GlassCard.module.css';

interface GlassCardProps {
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children }) => {
  return (
    <div className={styles.wrapper}>

      {/* me2you watermark */}
      <p className={styles.watermark}>
        <span style={{ letterSpacing: '16.43px' }}>me</span>
        <span style={{ fontFamily: 'var(--font-accent)', letterSpacing: '16.43px' }}>2</span>
        <span style={{ letterSpacing: '16.43px' }}>you</span>
      </p>

      {/* glass card */}
      <div className={styles.glassCard}>
        {children}
      </div>

    </div>
  );
};
