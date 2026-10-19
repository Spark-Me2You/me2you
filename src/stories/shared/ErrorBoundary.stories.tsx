import type { Story, StoryDefault } from '@ladle/react';
import { ErrorBoundary } from '@/core/monitoring/errorBoundary';

export default { title: 'Shared / Error Boundary' } satisfies StoryDefault;

function Crash(): never {
  throw new Error('Story crashed on purpose');
}

/** The fallback shown when a child throws while rendering. */
export const Fallback: Story = () => (
  <ErrorBoundary>
    <Crash />
  </ErrorBoundary>
);
Fallback.meta = { skipSmoke: true };
