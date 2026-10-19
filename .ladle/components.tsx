import type { GlobalProvider } from '@ladle/react';
import { StoryEnvironment, type StoryMeta } from '../src/stories/_support/StoryEnvironment';
import './tailwind.css';

export const Provider: GlobalProvider = ({ children, globalState, storyMeta }) => (
  <StoryEnvironment storyId={globalState.story} meta={(storyMeta ?? {}) as StoryMeta}>
    {children}
  </StoryEnvironment>
);
