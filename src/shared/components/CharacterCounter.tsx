import React from 'react';

interface CharacterCounterProps {
  current: number;
  max: number;
}

/**
 * Character Counter Component
 * TODO: Implement character counter for notes, bio, etc.
 */
export const CharacterCounter: React.FC<CharacterCounterProps> = ({ current, max }) => {
  const isNearLimit = current > max * 0.9;
  const isOverLimit = current > max;

  return (
    <div
      style={{
        fontSize: '14px',
        color: isOverLimit ? '#c00' : isNearLimit ? '#fa0' : '#666',
        textAlign: 'right',
      }}
    >
      {current} / {max}
    </div>
  );
};
