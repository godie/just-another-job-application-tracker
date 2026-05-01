import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

  const variants = {
    primary: 'bg-sage-600 text-white hover:bg-sage-700 dark:bg-sage-600 dark:hover:bg-sage-500 rounded',
    secondary: 'bg-earth-200 text-earth-800 hover:bg-earth-300 dark:bg-earth-700 dark:text-earth-100 dark:hover:bg-earth-600 rounded',
    outline: 'border border-earth-300 bg-transparent hover:bg-earth-100 dark:border-earth-600 dark:text-earth-300 dark:hover:bg-earth-700 rounded',
    ghost: 'bg-transparent hover:bg-earth-100 dark:hover:bg-earth-700 text-earth-600 dark:text-earth-400 rounded',
    danger: 'bg-terracotta-600 text-white hover:bg-terracotta-700 dark:bg-terracotta-600 dark:hover:bg-terracotta-500 rounded',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    icon: 'p-2',
  };

  const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
};

Button.displayName = 'Button';