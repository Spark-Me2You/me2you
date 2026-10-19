import { action, type Story, type StoryDefault } from '@ladle/react';
import { Button } from '@/shared/components';

export default { title: 'Shared / Button' } satisfies StoryDefault;

export const Variants: Story = () => (
  <div className="flex flex-wrap items-center gap-4 p-6">
    <Button onClick={action('primary')}>Primary</Button>
    <Button variant="secondary" onClick={action('secondary')}>
      Secondary
    </Button>
    <Button variant="danger" onClick={action('danger')}>
      Danger
    </Button>
    <Button disabled>Disabled</Button>
  </div>
);

export const Sizes: Story = () => (
  <div className="flex flex-wrap items-center gap-4 p-6">
    <Button size="small">Small</Button>
    <Button size="medium">Medium</Button>
    <Button size="large">Large</Button>
  </div>
);
