import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Separator } from './Separator';

describe('Separator', () => {
  it('renders correctly', () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toHaveClass('bg-gray-200');
  });

  it('applies horizontal classes by default', () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toHaveClass('h-[1px] w-full');
  });

  it('applies vertical classes when orientation is vertical', () => {
    const { container } = render(<Separator orientation="vertical" />);
    expect(container.firstChild).toHaveClass('h-full w-[1px]');
  });
});
