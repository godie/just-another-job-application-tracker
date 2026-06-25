import React, { useRef } from 'react';
import { Button } from './ui/Button';
import useFocusTrap from '../hooks/useFocusTrap';
import useKeyboardEscape from '../hooks/useKeyboardEscape';

interface KeyboardHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  key: string;
  description: string;
}

const shortcuts: ShortcutItem[] = [
  { key: '/', description: 'Focus search' },
  { key: 'n', description: 'New application' },
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'Escape', description: 'Close modal/dialog' },
  { key: 'Tab', description: 'Navigate between elements' },
  { key: 'Shift + Tab', description: 'Navigate backwards' },
];

const KeyboardHelp: React.FC<KeyboardHelpProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDialogElement>(null);

  useFocusTrap(modalRef, isOpen);
  useKeyboardEscape(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div
      role="none"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <dialog
        open
        ref={modalRef}
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
        className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4 border border-border"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2
              id="keyboard-help-title"
              className="text-xl font-semibold text-foreground"
            >
              Keyboard Shortcuts
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close keyboard shortcuts help"
              className="text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-muted-foreground"
            >
              <svg className="size-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Use these keyboard shortcuts to navigate the application more efficiently.
          </p>

          <ul className="space-y-3">
            {shortcuts.map((shortcut) => (
              <li
                key={shortcut.key}
                className="flex items-center justify-between py-2 border-b border-border dark:border-border last:border-0"
              >
                <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono text-foreground border border-border">
                  {shortcut.key}
                </kbd>
                <span className="text-sm text-muted-foreground">
                  {shortcut.description}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} variant="primary">
              Got it
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
};

export default KeyboardHelp;
