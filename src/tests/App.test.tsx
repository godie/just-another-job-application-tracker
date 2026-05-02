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

<<<<<<< HEAD
    // In SettingsPage, we expect the h1 heading "Settings"
    // Using level:1 to avoid matching h3 category labels that may contain "settings" in raw i18n keys
    expect(screen.getByRole('heading', { level: 1, name: /Settings/i })).toBeInTheDocument();
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

<<<<<<< HEAD
    // Check if it navigated to settings (use level:1 to match only the page title h1)
    expect(screen.getByRole('heading', { level: 1, name: /Settings/i })).toBeInTheDocument();
  });
});
