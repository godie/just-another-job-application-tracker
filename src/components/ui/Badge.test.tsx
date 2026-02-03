import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children correctly', () => {
    render(<Badge>Status</Badge>);
    expect(screen.getByText(/status/i)).toBeInTheDocument();
  });

  it('applies the correct variant classes', () => {
    const { rerender } = render(<Badge variant="default">Default</Badge>);
    expect(screen.getByText(/default/i)).toHaveClass('bg-gray-100');

    rerender(<Badge variant="danger">Danger</Badge>);
    expect(screen.getByText(/danger/i)).toHaveClass('bg-red-100');

    rerender(<Badge variant="success">Success</Badge>);
    expect(screen.getByText(/success/i)).toHaveClass('bg-green-100');
  });
});
