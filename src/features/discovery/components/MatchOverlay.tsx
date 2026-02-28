import React from 'react';

interface MatchOverlayProps {
  profileId: string | null;
  // TODO: Define props
}

/**
 * Match Overlay Component
 * TODO: Implement matched profile display
 */
export const MatchOverlay: React.FC<MatchOverlayProps> = ({ profileId }) => {
  if (!profileId) return null;

  return (
    <div>
      {/* TODO: Implement MatchOverlay */}
      <p>MatchOverlay placeholder</p>
      <p>Matched with profile: {profileId}</p>
    </div>
  );
};
