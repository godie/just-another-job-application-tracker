import { render, screen, waitFor } from '@testing-library/react';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import Alert from '../components/Alert';
import type { AlertType } from '../components/Alert';

describe('Alert Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const alertTypes: AlertType[] = ['success', 'error', 'warning', 'info'];

  test.each(alertTypes)('should render %s alert type', (type) => {
    render(<Alert type={type} message="Test message" />);
    
    const alert = screen.getByRole('alert', { hidden: true });
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Test message');
  });

  test('should display the correct icon for each alert type', () => {
    const { container: successContainer } = render(<Alert type="success" message="Success!" />);
    expect(successContainer.querySelector('svg')).toBeInTheDocument();
  });

  test('should auto-close after duration', async () => {
    const onClose = vi.fn();
    render(<Alert type="info" message="Auto closing" duration={100} onClose={onClose} />);
    
    expect(screen.getByText('Auto closing')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    }, { timeout: 500 });
  });

  test('should not auto-close when duration is 0', async () => {
    const onClose = vi.fn();
    render(<Alert type="info" message="No auto close" duration={0} onClose={onClose} />);
    
    expect(screen.getByText('No auto close')).toBeInTheDocument();
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    expect(onClose).not.toHaveBeenCalled();
  });

  test('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Alert type="warning" message="Click to close" onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close alert');
    closeButton.click();
    
    setTimeout(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    }, 400);
  });

  test('should not show close button when onClose is not provided', () => {
    render(<Alert type="info" message="No close button" />);
    
    expect(screen.queryByLabelText('Close alert')).not.toBeInTheDocument();
  });
});

