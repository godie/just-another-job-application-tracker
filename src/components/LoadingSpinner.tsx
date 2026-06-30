import React from 'react';
import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ className }) => {
  const { t } = useTranslation();
  return (
    <div className={`flex items-center justify-center ${className || ''}`}>
      <span className="size-5 border-2 border-primary/30 border-t-transparent rounded-full animate-spin mr-2" />
      <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
    </div>
  );
};
