import { vi } from 'vitest'

/** Silence console output for code under test that logs on purpose. Restored by `restoreMocks`. */
export function silenceConsole(...methods: Array<'log' | 'warn' | 'error'>): void {
  for (const method of methods.length ? methods : (['log', 'warn', 'error'] as const)) {
    vi.spyOn(console, method).mockImplementation(() => {})
  }
}
