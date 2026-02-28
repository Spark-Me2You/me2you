import { useEffect } from 'react';

/**
 * Keyboard Shortcut Hook
 * TODO: Accessibility keyboard shortcuts
 */
export const useKeyboardShortcut = (
  key: string,
  callback: () => void,
  modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean }
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const ctrlMatch = !modifiers?.ctrl || event.ctrlKey;
      const shiftMatch = !modifiers?.shift || event.shiftKey;
      const altMatch = !modifiers?.alt || event.altKey;

      if (event.key === key && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, modifiers]);
};
