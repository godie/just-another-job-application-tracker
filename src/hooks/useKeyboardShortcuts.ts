import { useEffect, useRef } from 'react';

interface KeyboardShortcutsOptions {
  onSearchFocus?: () => void;
  onNewEntry?: () => void;
  onShowHelp?: () => void;
  enabled?: boolean;
}

const useKeyboardShortcuts = ({
  onSearchFocus,
  onNewEntry,
  onShowHelp,
  enabled = true,
}: KeyboardShortcutsOptions) => {
  const handlersRef = useRef({
    onSearchFocus,
    onNewEntry,
    onShowHelp,
  });

  handlersRef.current = {
    onSearchFocus,
    onNewEntry,
    onShowHelp,
  };

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        if (e.key !== 'Escape' && e.key !== '?') {
          return;
        }
      }

      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      switch (e.key) {
        case '/':
          e.preventDefault();
          handlersRef.current.onSearchFocus?.();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          handlersRef.current.onNewEntry?.();
          break;
        case '?':
          e.preventDefault();
          handlersRef.current.onShowHelp?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
};

export default useKeyboardShortcuts;
