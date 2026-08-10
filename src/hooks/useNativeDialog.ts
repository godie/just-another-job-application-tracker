import { useEffect, type RefObject } from 'react';

const useNativeDialog = (
  ref: RefObject<HTMLDialogElement | null>,
  isOpen: boolean,
  onCancel?: () => void,
): void => {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onCancel?.();
    };

    dialog.addEventListener('cancel', handleCancel);
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      if (dialog.open) dialog.close();
    };
  }, [isOpen, onCancel, ref]);
};

export default useNativeDialog;
