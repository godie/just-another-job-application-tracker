import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SupportPage from '../pages/SupportPage';
import { AlertProvider } from '../components/AlertProvider';

const createMockResponse = <T,>(body: T) =>
  ({
    ok: true,
    json: async () => body,
  }) as Response;

beforeEach(() => {
  globalThis.fetch = vi.fn((_, init) => {
    if (!init || init.method === 'GET') {
      return Promise.resolve(createMockResponse({ success: true, captchaId: 'test-captcha', challenge: '12345' }));
    }

    return Promise.resolve(createMockResponse({ success: true }));
  }) as typeof fetch;
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('SupportPage', () => {
  it('renders sections', async () => {
    render(
      <AlertProvider>
        <SupportPage />
      </AlertProvider>
    );

    await screen.findByText('12345');
    expect(screen.getByText('Donations')).toBeInTheDocument();
    expect(screen.getByText('Suggestions')).toBeInTheDocument();
  });

  it('submits form', async () => {
    render(
      <AlertProvider>
        <SupportPage />
      </AlertProvider>
    );

    await screen.findByText('12345');

    const explanationInput = screen.getByPlaceholderText('Tell us more about your idea or the problem you found...');
    fireEvent.change(explanationInput, {
      target: { value: 'Dark mode improvements' },
    });

    fireEvent.change(screen.getByPlaceholderText('Enter digits'), {
      target: { value: '12345' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send suggestion' }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tell us more about your idea or the problem you found...')).toHaveValue('');
    });
  });
});
