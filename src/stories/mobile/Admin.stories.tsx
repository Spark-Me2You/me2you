/**
 * Admin login and org selection (the path to minting a kiosk session).
 * Any email/password signs in as the seeded admin.
 */

import { action, type Story, type StoryDefault } from '@ladle/react';
import App from '@/App';
import { LoginForm } from '@/features/admin/components/LoginForm';

export default { title: 'Mobile / Admin' } satisfies StoryDefault;

export const LoginPage: Story = () => <App />;
LoginPage.meta = { route: '/login' };

export const OrgSelector: Story = () => <App />;
OrgSelector.meta = { route: '/select-org', auth: 'admin' };

export const OrgSelectorLoading: Story = () => <App />;
OrgSelectorLoading.meta = { route: '/select-org', auth: 'admin', delay: 'forever' };

export const OrgSelectorFailed: Story = () => <App />;
OrgSelectorFailed.meta = { route: '/select-org', auth: 'admin', fail: ['organization'], allowConsoleErrors: true };

const submit = async (email: string, password: string) => action('submit')({ email, password });

export const FormIdle: Story = () => <LoginForm onSubmit={submit} error={null} isLoading={false} />;

export const FormSubmitting: Story = () => <LoginForm onSubmit={submit} error={null} isLoading />;

export const FormError: Story = () => <LoginForm onSubmit={submit} error="Invalid email or password." isLoading={false} />;
