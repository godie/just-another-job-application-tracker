import useKeyboardKey from './useKeyboardKey';

const useKeyboardEscape = (callback: () => void, isActive: boolean = true): void => {
  useKeyboardKey('Escape', callback, isActive);
};

export default useKeyboardEscape;
