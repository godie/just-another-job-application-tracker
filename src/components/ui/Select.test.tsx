import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from './Select';

describe('Select', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ];

  it('renders with a label and links them via id', () => {
    render(<Select label="Choices" id="choices" options={options} />);
    expect(screen.getByLabelText(/choices/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/choices/i)).toHaveAttribute('id', 'choices');
  });

  it('renders options correctly', () => {
    render(<Select label="Choices" id="choices" options={options} />);
    expect(screen.getByRole('option', { name: /option 1/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /option 2/i })).toBeInTheDocument();
  });

  it('calls onChange when selection changes', () => {
    const handleChange = vi.fn();
    render(<Select label="Choices" id="choices" options={options} onChange={handleChange} />);
    fireEvent.change(screen.getByLabelText(/choices/i), { target: { value: 'option2' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('renders error message when error prop is provided', () => {
    render(<Select label="Choices" id="choices" error="Required field" />);
    expect(screen.getByText(/required field/i)).toBeInTheDocument();
  });
});
