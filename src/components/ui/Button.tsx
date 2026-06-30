import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { buttonVariants, type ButtonVariants } from './buttonVariants';

interface ButtonProps
  extends React.ComponentProps<'button'>,
    ButtonVariants {
  asChild?: boolean;
}

const Button = ({
  className, variant, size, asChild = false, ref, ...props
}: ButtonProps) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  };
Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
