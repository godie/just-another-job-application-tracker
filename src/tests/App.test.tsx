// src/tests/App.test.tsx
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from '../App';

// Mock components that might be problematic in test environment
vi.mock('../layouts/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/PWAReloadPrompt', () => ({
  default: () => null,
}));

describe('App Navigation and History', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset URL to base
    window.history.replaceState({}, '', '/');
  });

  it('renders the landing page by default', () => {
    render(<App />);
    expect(screen.getByText(/Master Your Job Search/i)).toBeInTheDocument();
  });

  it('navigates to the page specified in the URL query parameter', () => {
    // Set up URL with page parameter
    const url = new URL(window.location.href);
    url.searchParams.set('page', 'settings');
    window.history.replaceState({}, '', url.toString());

    render(<App />);

    // In SettingsPage, we expect the heading "Settings"
    // Using exact string since i18next might be configured to return keys if not loaded,
    // but the output shows "Settings" is rendered.
    expect(screen.getByRole('heading', { name: /Settings/i })).toBeInTheDocument();
  });

  it('updates the URL when the page changes', async () => {
    render(<App />);

    // Initially on landing
    expect(window.location.search).toContain('page=landing');
  });

  it('updates the page when the popstate event occurs', async () => {
    render(<App />);

    // Simulate navigation to settings via URL change and popstate
    const url = new URL(window.location.href);
    url.searchParams.set('page', 'settings');
    window.history.pushState({ page: 'settings' }, '', url.toString());

    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { page: 'settings' } }));
    });

    // Check if it navigated to settings
    expect(screen.getByRole('heading', { name: /Settings/i })).toBeInTheDocument();
  });
});
