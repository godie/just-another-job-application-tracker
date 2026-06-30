import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '../pages/SettingsPage';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AlertProvider } from '../components/AlertProvider';
import { DEFAULT_PREFERENCES } from '../utils/constants';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    getStore: () => store,
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

const renderWithGoogleProvider = (ui: React.ReactElement) => {
  return render(
    <GoogleOAuthProvider clientId='test-client-id'>
      <AlertProvider>
      {ui}
      </AlertProvider>
    </GoogleOAuthProvider>
  );
};

beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.setItem('jobTrackerPreferences', JSON.stringify(DEFAULT_PREFERENCES));
});

describe('SettingsPage', () => {
  describe('Rendering', () => {
    test('renders Settings page with header and sidebar navigation', async () => {
      renderWithGoogleProvider(<SettingsPage />);

      expect(screen.getByRole('heading', { level: 1, name: /Settings/i })).toBeInTheDocument();
      expect(screen.getByText(/General/i)).toBeInTheDocument();
      expect(screen.getByText(/Data/i)).toBeInTheDocument();
      expect(screen.getByText(/Account/i)).toBeInTheDocument();
    });

    test('sets the document title via useSEO hook', async () => {
      renderWithGoogleProvider(<SettingsPage />);
      expect(document.title).toBe('Settings | JAJAT');
    });

    test('switches sections when sidebar buttons are clicked', async () => {
      renderWithGoogleProvider(<SettingsPage />);

      const defaultViewElements = screen.getAllByText(/Default View/i);
      expect(defaultViewElements.length).toBeGreaterThan(0);

      const customFieldsBtn = screen.getByText(/Custom Fields/i);
      fireEvent.click(customFieldsBtn);

      await waitFor(() => {
        const customFieldsHeaders = screen.getAllByText(/Custom Fields/i);
        expect(customFieldsHeaders.length).toBeGreaterThan(1); // One in sidebar, one in header
      });
    });
  });

  describe('Functionality', () => {
    test('saves changes and shows success message', async () => {
      renderWithGoogleProvider(<SettingsPage />);

      const kanbanView = screen.getByText(/Kanban/i);
      fireEvent.click(kanbanView);

      expect(screen.getByText(/UNSAVED CHANGES/i)).toBeInTheDocument();

      const saveBtn = screen.getAllByRole('button').find(el => el.textContent?.includes('Save Changes'));
      if (saveBtn) fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Settings saved successfully/i)).toBeInTheDocument();
        expect(screen.queryByText(/UNSAVED CHANGES/i)).not.toBeInTheDocument();
      });
    });
  });
});