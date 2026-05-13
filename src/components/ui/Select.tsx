import React from 'react';

interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export function Select({ className = '', children, label, error, options, id, required, ...props }: SelectProps) {
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <div className='w-full'>
      {label && (
        <label
          htmlFor={id}
          className='block text-xs font-semibold text-earth-600 dark:text-earth-400 mb-1'
        >
          {label}
          {required && <span className="text-terracotta-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        id={id}
        aria-invalid={!!error}
        aria-describedby={errorId}
        aria-required={required}
        className={`w-full rounded border ${error ? 'border-terracotta-400 dark:border-terracotta-500' : 'border-earth-300 dark:border-earth-600'} px-3 py-2 text-sm shadow-sm focus:border-sage-500 dark:focus:border-sage-400 focus:ring-2 focus:ring-sage-500/20 dark:focus:ring-sage-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 dark:focus-visible:ring-sage-400 bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${className}`}
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
        <p id={errorId} role="alert" className='mt-1 text-xs text-terracotta-600 dark:text-terracotta-400'>{error}</p>
      )}
    </div>
  );
}