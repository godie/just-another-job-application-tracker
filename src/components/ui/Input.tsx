import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.ComponentProps<'input'> {
  label?: string;
  error?: string;
  required?: boolean;
}

const Input = ({
  className, type, label, error, id, required, ref, ...props
}: InputProps) => {
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
        <input
          id={id}
          type={type}
          aria-invalid={!!error}
          aria-describedby={errorId}
          aria-required={required}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  };
Input.displayName = 'Input';

export { Input };
