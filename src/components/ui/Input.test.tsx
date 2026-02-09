import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders with a label and links them via id', () => {
    render(<Input label="Username" id="username" />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toHaveAttribute('id', 'username');
  });

  it('calls onChange when text is entered', () => {
    const handleChange = vi.fn();
    render(<Input label="Username" id="username" onChange={handleChange} />);
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'johndoe' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('renders error message when error prop is provided', () => {
    render(<Input label="Username" id="username" error="Required field" />);
    expect(screen.getByText(/required field/i)).toBeInTheDocument();
    expect(screen.getByText(/required field/i)).toHaveClass('text-red-600');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input label="Username" id="username" disabled />);
    expect(screen.getByLabelText(/username/i)).toBeDisabled();
  });
});
