import React from 'react';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

/**
 * Error Message Component
 * TODO: Implement error display
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onDismiss }) => {
  return (
    <div
      style={{
        // TODO: Implement proper error styling with theme
        backgroundColor: '#fee',
        color: '#c00',
        padding: '12px',
        borderRadius: '4px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#c00',
            cursor: 'pointer',
            fontSize: '20px',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};
