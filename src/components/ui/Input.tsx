import React from 'react';

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ className = '', type, label, error, id, ...props }: InputProps) {
  return (
    <div className='w-full'>
      {label && (
        <label
          htmlFor={id}
          className='block text-xs font-semibold text-earth-600 dark:text-earth-400 mb-1'
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        className={`w-full rounded border border-earth-300 dark:border-earth-600 px-3 py-2 text-sm bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100 placeholder-earth-400 dark:placeholder-earth-500 focus:border-sage-500 dark:focus:border-sage-400 focus:ring-sage-500 dark:focus:ring-sage-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${className}`}
        {...props}
      />
      {error && (
        <p className='mt-1 text-xs text-terracotta-600 dark:text-terracotta-400'>{error}</p>
      )}
    </div>
  );
}