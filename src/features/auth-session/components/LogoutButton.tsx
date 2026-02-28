import React from 'react';

interface LogoutButtonProps {
  onLogout?: () => void;
}

/**
 * Logout Button Component
 * TODO: Implement logout button
 */
export const LogoutButton: React.FC<LogoutButtonProps> = ({ onLogout }) => {
  return (
    <button onClick={onLogout}>
      {/* TODO: Implement LogoutButton styling */}
      Logout
    </button>
  );
};
