import { useEffect, type RefObject } from 'react';

const useDialogBackdropClose = (
  ref: RefObject<HTMLDialogElement | null>,
  onClose: () => void,
): void => {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target === dialog) onClose();
    };

    dialog.addEventListener('click', handleBackdropClick);
    return () => dialog.removeEventListener('click', handleBackdropClick);
  }, [onClose, ref]);
};

export default useDialogBackdropClose;
