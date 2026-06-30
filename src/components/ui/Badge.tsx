import * as React from 'react';
import { cn } from '@/lib/utils';
import { badgeVariants, type BadgeVariants } from './badgeVariants';

export interface BadgeProps
  extends React.ComponentProps<'div'>,
    BadgeVariants {}

const Badge = ({
  className, variant, ref, ...props
}: BadgeProps) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    );
  };
Badge.displayName = 'Badge';

export { Badge };
