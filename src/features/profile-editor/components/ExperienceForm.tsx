import React from 'react';

interface ExperienceFormProps {
  experiences: any[]; // TODO: Define experience type
  onChange: (experiences: any[]) => void;
}

/**
 * Experience Form Component
 * TODO: Implement dynamic work experience entries
 */
export const ExperienceForm: React.FC<ExperienceFormProps> = ({ experiences, onChange: _onChange }) => {
  return (
    <div>
      {/* TODO: Implement ExperienceForm */}
      <p>ExperienceForm placeholder</p>
      <p>Number of experiences: {experiences.length}</p>
    </div>
  );
};
