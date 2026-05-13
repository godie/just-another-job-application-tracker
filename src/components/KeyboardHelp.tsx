import React, { useRef } from 'react';
import { Button } from './ui';
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

export const KeyboardHelp: React.FC<KeyboardHelpProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(modalRef, isOpen);
  useKeyboardEscape(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-earth-900/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
        className="bg-white dark:bg-earth-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-earth-200 dark:border-earth-700"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2
              id="keyboard-help-title"
              className="text-xl font-semibold text-earth-900 dark:text-earth-100"
            >
              Keyboard Shortcuts
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close keyboard shortcuts help"
              className="text-earth-500 hover:text-earth-700 dark:text-earth-400 dark:hover:text-earth-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </Button>
          </div>

          <p className="text-sm text-earth-600 dark:text-earth-400 mb-4">
            Use these keyboard shortcuts to navigate the application more efficiently.
          </p>

          <ul className="space-y-3">
            {shortcuts.map((shortcut) => (
              <li
                key={shortcut.key}
                className="flex items-center justify-between py-2 border-b border-earth-100 dark:border-earth-700 last:border-0"
              >
                <kbd className="px-2 py-1 bg-earth-100 dark:bg-earth-700 rounded text-sm font-mono text-earth-700 dark:text-earth-300 border border-earth-200 dark:border-earth-600">
                  {shortcut.key}
                </kbd>
                <span className="text-sm text-earth-600 dark:text-earth-400">
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
      </div>
    </div>
  );
};

export default KeyboardHelp;
