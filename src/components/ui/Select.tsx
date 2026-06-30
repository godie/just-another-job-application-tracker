import * as React from 'react';
import { cn } from '@/lib/utils';

interface SelectProps
  extends React.ComponentProps<'select'> {
  label?: string;
  error?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

const Select = ({
  className, children, label, error, options, id, required, ref, ...props
}: SelectProps) => {
    const errorId = error && id ? `${id}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-foreground mb-1"
          >
            {label}
            {required && (
              <span className="text-destructive ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={errorId}
          aria-required={required}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
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
          <p id={errorId} role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  };
Select.displayName = 'Select';

export { Select };
