import React from 'react';

interface InterestTagsProps {
  interests: string[];
  onChange: (interests: string[]) => void;
  maxTags?: number;
}

/**
 * Interest Tags Component
 * TODO: Implement tag input (max 15)
 */
export const InterestTags: React.FC<InterestTagsProps> = ({
  interests,
  onChange: _onChange,
  maxTags = 15,
}) => {
  return (
    <div>
      {/* TODO: Implement InterestTags */}
      <p>InterestTags placeholder</p>
      <p>Current tags: {interests.length} / {maxTags}</p>
    </div>
  );
};
