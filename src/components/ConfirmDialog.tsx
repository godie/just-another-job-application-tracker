import React from 'react';
import { Button } from './ui';

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
  if (!isOpen) return null;

  const typeStyles = {
    warning: {
      icon: (
        <svg className='size-5' fill='currentColor' viewBox='0 0 20 20'>
          <path fillRule='evenodd' d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
        </svg>
      ),
      bg: 'bg-earth-50 dark:bg-earth-800',
      border: 'border-earth-300 dark:border-earth-600',
      text: 'text-earth-800 dark:text-earth-200',
      iconColor: 'text-earth-600 dark:text-earth-400',
    },
    danger: {
      icon: (
        <svg className='size-5' fill='currentColor' viewBox='0 0 20 20'>
          <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clipRule='evenodd' />
        </svg>
      ),
      bg: 'bg-terracotta-50 dark:bg-terracotta-900/30',
      border: 'border-terracotta-200 dark:border-terracotta-700',
      text: 'text-terracotta-800 dark:text-terracotta-200',
      iconColor: 'text-terracotta-600 dark:text-terracotta-400',
    },
  };

  const styles = typeStyles[type];

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-earth-900/80 backdrop-blur-sm'>
      <div className={`${styles.bg} ${styles.border} border-l-2 rounded max-w-md w-full mx-4`}>
        <div className='p-6'>
          <div className='flex items-start'>
            <div className={`flex-shrink-0 mr-4 ${styles.iconColor}`}>
              {styles.icon}
            </div>
            <div className='flex-1'>
              <h3 className={`text-lg font-semibold ${styles.text} mb-2`}>
                {title}
              </h3>
              <p className='text-sm text-earth-600 dark:text-earth-400 mb-5'>
                {message}
              </p>
              <div className='flex justify-end gap-3'>
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
                >
                  {confirmText}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;