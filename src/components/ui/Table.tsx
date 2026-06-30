import * as React from 'react';
import { cn } from '@/lib/utils';

const Table = ({
  className, ref, ...props
}: React.ComponentProps<'table'>) => (
  <section
    className="relative w-full overflow-auto focus:outline-none"
    aria-label="Data Table"
  >
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </section>
);
Table.displayName = 'Table';

const TableHeader = ({
  className, ref, ...props
}: React.ComponentProps<'thead'>) => (
  <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
);
TableHeader.displayName = 'TableHeader';

const TableBody = ({
  className, ref, ...props
}: React.ComponentProps<'tbody'>) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
);
TableBody.displayName = 'TableBody';

const TableRow = ({
  className, ref, ...props
}: React.ComponentProps<'tr'>) => (
  <tr
    ref={ref}
    className={cn(
      'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
      className
    )}
    {...props}
  />
);
TableRow.displayName = 'TableRow';

const TableHead = ({
  className, ref, ...props
}: React.ComponentProps<'th'>) => (
  <th
    ref={ref}
    className={cn(
      'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
);
TableHead.displayName = 'TableHead';

const TableCell = ({
  className, ref, ...props
}: React.ComponentProps<'td'>) => (
  <td
    ref={ref}
    className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}
    {...props}
  />
);
TableCell.displayName = 'TableCell';

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
};
