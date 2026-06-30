import React, { useCallback } from 'react';
import { Button } from './ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/Dialog';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'danger';
}

const CONFIRM_DIALOG_TYPE_STYLES = {
  warning: {
    icon: (
      <svg className='size-5' fill='currentColor' viewBox='0 0 20 20'>
        <path fillRule='evenodd' d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
      </svg>
    ),
    iconColor: 'text-muted-foreground',
  },
  danger: {
    icon: (
      <svg className='size-5' fill='currentColor' viewBox='0 0 20 20'>
        <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clipRule='evenodd' />
      </svg>
    ),
    iconColor: 'text-destructive',
  },
} as const;

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning',
}) => {
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      onCancel();
    }
  }, [onCancel]);

  const styles = CONFIRM_DIALOG_TYPE_STYLES[type];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className='flex items-start gap-3'>
            <div className={`flex-shrink-0 mt-1 ${styles.iconColor}`} aria-hidden='true'>
              {styles.icon}
            </div>
            <DialogTitle id='confirm-dialog-title'>
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription id='confirm-dialog-message'>
          {message}
        </DialogDescription>

        <DialogFooter>
          <Button
            variant='outline'
            type='button'
            onClick={onCancel}
          >
            {cancelText}
          </Button>
          <Button
            variant={type === 'danger' ? 'danger' : 'primary'}
            type='button'
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
