import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SuggestionsViewerPage from '../pages/SuggestionsViewerPage';
import { AlertProvider } from '../components/AlertProvider';

const createMockResponse = <T,>(body: T) =>
  ({
    ok: true,
    json: async () => body,
  }) as Response;

beforeEach(() => {
  globalThis.fetch = vi.fn(() => {
    return Promise.resolve(createMockResponse({
      success: true,
      suggestions: [
        {
          id: 1,
          types: ['bug', 'ui-ux'],
          explanation: 'Test suggestion 1',
          created_at: '2025-01-01T12:00:00Z',
          ip_address: '127.0.0.1'
        }
      ]
    }));
  }) as typeof fetch;
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('SuggestionsViewerPage', () => {
  it('renders suggestions list', async () => {
    const onNavigate = vi.fn();
    render(
      <AlertProvider>
        <SuggestionsViewerPage onNavigate={onNavigate} />
      </AlertProvider>
    );

    expect(await screen.findByText('Test suggestion 1')).toBeInTheDocument();
    // In English locale, bug -> Bug, ui-ux -> UI/UX
    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByText('UI/UX')).toBeInTheDocument();
  });

  it('shows empty message when no suggestions', async () => {
    globalThis.fetch = vi.fn(() => {
        return Promise.resolve(createMockResponse({
          success: true,
          suggestions: []
        }));
      }) as typeof fetch;

    const onNavigate = vi.fn();
    render(
      <AlertProvider>
        <SuggestionsViewerPage onNavigate={onNavigate} />
      </AlertProvider>
    );

    expect(await screen.findByText('No suggestions yet.')).toBeInTheDocument();
  });
});
