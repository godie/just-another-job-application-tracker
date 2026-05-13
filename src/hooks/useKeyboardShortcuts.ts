import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  onSearchFocus?: () => void;
  onNewEntry?: () => void;
  onShowHelp?: () => void;
  enabled?: boolean;
}

/**
 * Hook to manage keyboard shortcuts for accessibility.
 * Provides common shortcuts:
 * - / : Focus search
 * - n : New entry
 * - ? : Show keyboard shortcuts help
 */
export const useKeyboardShortcuts = ({
  onSearchFocus,
  onNewEntry,
  onShowHelp,
  enabled = true,
}: KeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        // Allow Escape and ? even in inputs
        if (e.key !== 'Escape' && e.key !== '?') {
          return;
        }
      }

      // Don't trigger when modifier keys are pressed (except for ? which uses shift)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      switch (e.key) {
        case '/':
          e.preventDefault();
          onSearchFocus?.();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          onNewEntry?.();
          break;
        case '?':
          e.preventDefault();
          onShowHelp?.();
          break;
      }
    },
    [onSearchFocus, onNewEntry, onShowHelp]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
};

export default useKeyboardShortcuts;
