import React from 'react';
import { ConnectGoogleButton } from './ConnectGoogleButton';

interface GoogleAuthCardProps {
  title: string;
  description: string;
  buttonLabel: string;
  onAction: () => void;
  variant?: 'primary' | 'warning';
  className?: string;
}

const variantConfig = {
  primary: {
    container: 'bg-primary/5 dark:bg-primary/10 border-primary/20',
    iconBg: 'bg-primary/10 dark:bg-primary/90',
    title: 'text-primary',
    description: 'text-primary',
    button: 'bg-primary text-primary-foreground hover:bg-primary/90',
    icon: (
      <svg className="size-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 5.25 1.65 5.25 1.65l1.83-1.8S16.22 2 12.17 2C6.63 2 2 6.44 2 12c0 5.52 4.46 10 10 10 5.14 0 9.35-3.65 9.35-8.77 0-1.15-.14-2.13 0-2.13z" fill="#4285F4"/>
      </svg>
    ),
  },
  warning: {
    container: 'bg-earth-50 dark:bg-earth-800/40 border-earth-200 dark:border-earth-700',
    iconBg: 'bg-earth-100 dark:bg-earth-700',
    title: 'text-earth-700 dark:text-earth-200',
    description: 'text-earth-600 dark:text-earth-400',
    button: 'bg-earth-600 hover:bg-earth-700 text-white',
    icon: (
      <svg className="size-6 text-earth-600 dark:text-earth-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0-8v4m0 0a9 9 0 110-18 9 9 0 010 18z" />
      </svg>
    ),
  },
};

export const GoogleAuthCard: React.FC<GoogleAuthCardProps> = ({
  title,
  description,
  buttonLabel,
  onAction,
  variant = 'primary',
  className,
}) => {
  const cfg = variantConfig[variant];
  return (
    <div className={`border rounded-lg p-6 ${cfg.container} ${className || ''}`}>
      <div className="text-center">
        <div className={`size-12 mx-auto mb-3 rounded-full flex items-center justify-center ${cfg.iconBg}`}>
          {cfg.icon}
        </div>
        <h4 className={`text-sm font-semibold mb-2 ${cfg.title}`}>
          {title}
        </h4>
        <p className={`text-xs mb-4 ${cfg.description}`}>
          {description}
        </p>
        <ConnectGoogleButton
          label={buttonLabel}
          onSuccess={onAction}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${cfg.button}`}
        />
      </div>
    </div>
  );
};
