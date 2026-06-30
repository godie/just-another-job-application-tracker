import { render, screen, act } from '@testing-library/react';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import { AlertProvider, useAlert } from '../components/AlertProvider';

const TestComponent = () => {
  const { showSuccess, showError, showWarning, showInfo, showAlert } = useAlert();

  return (
    <div>
      <button onClick={() => showSuccess('Success message')}>Show Success</button>
      <button onClick={() => showError('Error message')}>Show Error</button>
      <button onClick={() => showWarning('Warning message')}>Show Warning</button>
      <button onClick={() => showInfo('Info message')}>Show Info</button>
      <button onClick={() => showAlert({ type: 'success', message: 'Custom alert' })}>
        Show Custom
      </button>
    </div>
  );
};

describe('AlertProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render without crashing', () => {
    render(
      <AlertProvider>
        <div>Test content</div>
      </AlertProvider>
    );
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  test('should provide alert context to children', () => {
    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );
    
    expect(screen.getByText('Show Success')).toBeInTheDocument();
    expect(screen.getByText('Show Error')).toBeInTheDocument();
    expect(screen.getByText('Show Warning')).toBeInTheDocument();
    expect(screen.getByText('Show Info')).toBeInTheDocument();
  });

  test('should display success alert when showSuccess is called', async () => {
    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );
    
    const successButton = screen.getByText('Show Success');
    
    await act(async () => {
      successButton.click();
    });
    
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  test('should display error alert when showError is called', async () => {
    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );
    
    const errorButton = screen.getByText('Show Error');
    
    await act(async () => {
      errorButton.click();
    });
    
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  test('should display warning alert when showWarning is called', async () => {
    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );
    
    const warningButton = screen.getByText('Show Warning');
    
    await act(async () => {
      warningButton.click();
    });
    
    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  test('should display info alert when showInfo is called', async () => {
    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );
    
    const infoButton = screen.getByText('Show Info');
    
    await act(async () => {
      infoButton.click();
    });
    
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  test('should display custom alert when showAlert is called', async () => {
    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );
    
    const customButton = screen.getByText('Show Custom');
    
    await act(async () => {
      customButton.click();
    });
    
    expect(screen.getByText('Custom alert')).toBeInTheDocument();
  });

  test('should allow multiple alerts to be displayed', async () => {
    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );
    
    await act(async () => {
      screen.getByText('Show Success').click();
      screen.getByText('Show Error').click();
    });
    
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
});

