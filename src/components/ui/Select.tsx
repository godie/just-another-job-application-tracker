import React from 'react';

interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string }[];
}

export function Select({ className = '', children, label, error, options, id, ...props }: SelectProps) {
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
      <select
        id={id}
        className={`w-full rounded border border-earth-300 dark:border-earth-600 px-3 py-2 text-sm shadow-sm focus:border-sage-500 dark:focus:border-sage-400 focus:ring-sage-500 dark:focus:ring-sage-400 bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${className}`}
        {...props}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>
      {error && (
        <p className='mt-1 text-xs text-terracotta-600 dark:text-terracotta-400'>{error}</p>
      )}
    </div>
  );
}