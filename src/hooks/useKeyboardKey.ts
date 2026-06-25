import { useEffect } from 'react';

const useKeyboardKey = (
  key: string,
  callback: () => void,
  isActive: boolean = true
): void => {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === key) {
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [key, callback, isActive]);
};

export default useKeyboardKey;
