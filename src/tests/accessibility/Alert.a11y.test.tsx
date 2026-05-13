import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Alert from '../../components/Alert';

/**
 * Accessibility tests for Alert component
 * These tests verify WCAG compliance for alerts and notifications
 */
describe('Alert Accessibility', () => {
  it('renders with role alert', () => {
    render(<Alert type="info" message="Test message" />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('has aria-live polite for non-critical alerts', () => {
    render(<Alert type="info" message="Test message" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('has aria-atomic true to announce complete message', () => {
    render(<Alert type="info" message="Test message" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-atomic', 'true');
  });

  it('close button has accessible label', () => {
    render(<Alert type="info" message="Test message" onClose={() => {}} />);

    const closeButton = screen.getByLabelText('Close alert');
    expect(closeButton).toBeInTheDocument();
  });

  it('close button is focusable and has focus indicator', () => {
    render(<Alert type="info" message="Test message" onClose={() => {}} />);

    const closeButton = screen.getByLabelText('Close alert');
    // Buttons are natively focusable; tabIndex is not required
    expect(closeButton.tagName.toLowerCase()).toBe('button');
    expect(closeButton.className).toContain('focus');
  });

  it('renders all alert types with appropriate roles', () => {
    const types: Array<'success' | 'error' | 'warning' | 'info'> = ['success', 'error', 'warning', 'info'];

    types.forEach((type) => {
      const { unmount } = render(<Alert type={type} message={`${type} message`} />);
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      unmount();
    });
  });
});
