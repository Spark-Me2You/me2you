import React from 'react';

interface ProfileCardProps {
  profileId: string;
  photo?: string;
  topInterests?: string[];
  onClick?: () => void;
}

/**
 * Profile Card Component
 * TODO: Implement card with photo + top 3 interests
 */
export const ProfileCard: React.FC<ProfileCardProps> = ({
  profileId,
  photo,
  topInterests = [],
  onClick,
}) => {
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', border: '1px solid #ccc', padding: '8px' }}>
      {/* TODO: Implement ProfileCard */}
      <p>ProfileCard placeholder</p>
      <p>Profile ID: {profileId}</p>
      {photo && <img src={photo} alt="Profile" style={{ width: '100%' }} />}
      <ul>
        {topInterests.slice(0, 3).map((interest, index) => (
          <li key={index}>{interest}</li>
        ))}
      </ul>
    </div>
  );
};
