import React from 'react';

interface ProfileDetailProps {
  profileId: string | null;
  onClose: () => void;
}

/**
 * Profile Detail Component
 * TODO: Implement full profile modal
 */
export const ProfileDetail: React.FC<ProfileDetailProps> = ({ profileId, onClose }) => {
  if (!profileId) return null;

  return (
    <div>
      {/* TODO: Implement ProfileDetail modal */}
      <p>ProfileDetail placeholder</p>
      <p>Viewing profile: {profileId}</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
};
