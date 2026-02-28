import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
}

/**
 * Button Component
 * TODO: Implement accessible, touch-optimized button
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant: _variant = 'primary',
  size = 'medium',
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        // TODO: Implement proper styling with theme
        padding: size === 'large' ? '16px 32px' : '8px 16px',
        fontSize: size === 'large' ? '24px' : '16px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
};
