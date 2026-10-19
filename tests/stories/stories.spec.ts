/**
 * Story smoke test
 * Opens every story from the Ladle build and fails if it throws, logs a
 * console error, or renders the ErrorBoundary fallback. Stories that render
 * error states on purpose opt out of the console check with `meta.allowConsoleErrors`.
 */

import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

interface LadleMeta {
  stories: Record<string, { name: string; meta?: { allowConsoleErrors?: boolean; skipSmoke?: boolean } }>;
}

const meta: LadleMeta = JSON.parse(readFileSync(new URL('../../build/meta.json', import.meta.url), 'utf8'));

/** Noise from the browser environment rather than from app code. */
const IGNORED_CONSOLE = [/Download the React DevTools/, /WebGL/i, /GPU stall/i];

const SETTLE_MS = 1500;

for (const [id, story] of Object.entries(meta.stories)) {
  if (story.meta?.skipSmoke) continue;

  test(id, async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      if (!IGNORED_CONSOLE.some((pattern) => pattern.test(text))) consoleErrors.push(text);
    });

    await page.goto(`/?story=${id}&mode=preview`);
    await page.locator('html[data-storyloaded]').waitFor({ state: 'attached' });
    await page.waitForTimeout(SETTLE_MS);

    expect(pageErrors, 'uncaught errors').toEqual([]);
    if (!story.meta?.allowConsoleErrors) expect(consoleErrors, 'console errors').toEqual([]);
    await expect(page.getByText('Something went wrong.')).toHaveCount(0);
  });
}
