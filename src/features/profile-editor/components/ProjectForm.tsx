import React from 'react';

interface ProjectFormProps {
  projects: any[]; // TODO: Define project type
  onChange: (projects: any[]) => void;
}

/**
 * Project Form Component
 * TODO: Implement dynamic project entries
 */
export const ProjectForm: React.FC<ProjectFormProps> = ({ projects, onChange: _onChange }) => {
  return (
    <div>
      {/* TODO: Implement ProjectForm */}
      <p>ProjectForm placeholder</p>
      <p>Number of projects: {projects.length}</p>
    </div>
  );
};
