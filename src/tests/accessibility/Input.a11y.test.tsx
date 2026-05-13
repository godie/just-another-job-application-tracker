import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../../components/ui/Input';

/**
 * Accessibility tests for Input component
 * These tests verify WCAG compliance
 */
describe('Input Accessibility', () => {
  it('renders with proper label association', () => {
    render(<Input id="test-input" label="Test Label" />);

    const input = screen.getByLabelText('Test Label');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'test-input');
  });

  it('associates error message with input via aria-describedby', () => {
    render(<Input id="test-input" label="Test Label" error="This field is required" />);

    const input = screen.getByLabelText('Test Label');
    expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');

    const error = screen.getByRole('alert');
    expect(error).toHaveAttribute('id', 'test-input-error');
    expect(error.textContent).toBe('This field is required');
  });

  it('marks required fields with aria-required', () => {
    render(<Input id="test-input" label="Test Label" required />);

    const input = screen.getByLabelText(/Test Label/);
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('has visible focus indicator styles', () => {
    render(<Input id="test-input" label="Test Label" />);

    const input = screen.getByLabelText('Test Label');
    // Check that the input has focus-visible classes
    expect(input.className).toContain('focus-visible:ring-2');
    expect(input.className).toContain('focus-visible:ring-sage-500');
  });

  it('does not have aria-invalid when there is no error', () => {
    render(<Input id="test-input" label="Test Label" />);

    const input = screen.getByLabelText('Test Label');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('associates label correctly with htmlFor attribute', () => {
    render(<Input id="test-input" label="Test Label" />);

    const label = screen.getByText('Test Label', { selector: 'label' });
    expect(label).toHaveAttribute('for', 'test-input');
  });
});
