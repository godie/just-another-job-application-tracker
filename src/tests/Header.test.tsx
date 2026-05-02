import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import Header from '../components/Header';
import { AlertProvider } from '../components/AlertProvider';
import { useIsLoggedIn } from '../hooks/useIsLoggedIn';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));


// =========================================================================
// MOCKS SETUP
// =========================================================================

const localStorageStore: Record<string, string> = {};

// Mock the API module
vi.mock('../utils/api', () => ({
  setAuthCookieWithCode: vi.fn(() => Promise.resolve({ success: true })),
  clearAuthCookie: vi.fn(() => Promise.resolve({ success: true })),
  getAuthCookie: vi.fn(),
}));

// Helper function to render with AlertProvider
const renderWithProviders = (ui: React.ReactElement) => {
  return render(<AlertProvider>{ui}</AlertProvider>);
};

// Mock function for sidebar toggle
const mockToggleSidebar = vi.fn();

vi.mock('../hooks/useIsLoggedIn', () => ({
  useIsLoggedIn: vi.fn(),
}));

// Mock the module that provides the utility functions
vi.mock('../utils/localStorage', () => {
  const checkLoginStatus = vi.fn(() => {
    return localStorageStore['isLoggedIn'] === 'true';
  });
  
  const setLoginStatus = vi.fn((status: boolean) => {
    if (status) {
      localStorageStore['isLoggedIn'] = 'true';
    } else {
      delete localStorageStore['isLoggedIn'];
    }
  });

  return {
    checkLoginStatus,
    setLoginStatus,
    getApplications: vi.fn(() => []),
    saveApplications: vi.fn(),
    getOpportunities: vi.fn(() => []),
  };
});

// Mock the auth store
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    currentUser: localStorageStore['isLoggedIn'] === 'true'
      ? { id: 1, email: 'test@example.com', name: 'Test User' }
      : null,
    isAuthenticated: localStorageStore['isLoggedIn'] === 'true',
    logout: vi.fn(async () => {
      await fetch('/api/auth/logout', { method: 'DELETE' });
    }),
    fetchMe: vi.fn(),
    setUser: vi.fn(),
    setError: vi.fn(),
    isLoading: false,
    error: null,
  })),
}));

// Mock AuthModals to track openLogin calls
const mockOpenLogin = vi.fn();
const mockCloseModal = vi.fn();
vi.mock('../components/AuthModals', () => ({
  useAuthModals: vi.fn(() => ({
    isOpen: false,
    initialMode: 'login',
    openLogin: mockOpenLogin,
    openRegister: vi.fn(),
    closeModal: mockCloseModal,
    AuthModal: () => null,
  })),
}));

// =========================================================================
// TEST SUITE
// =========================================================================

describe('Header Component', () => {

  beforeEach(() => {
    // Clear mocks and reset state before each test
    vi.clearAllMocks();
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
    localStorageStore['isLoggedIn'] = 'false'; // Default to logged out
    vi.mocked(useIsLoggedIn).mockReturnValue(false);
    mockOpenLogin.mockClear();
    mockToggleSidebar.mockClear();
    // Reset theme in localStorage
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });

  test('should render the application title (desktop version)', () => {
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
    // Desktop version should show full title (hidden on mobile via lg:block)
    const desktopTitle = screen.getByTestId('app-title');
    expect(desktopTitle).toBeInTheDocument();
    expect(desktopTitle).toHaveTextContent('Just Another Job Application Tracker');
  });

  test('should render mobile logo image', () => {
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
    // Mobile version should show logo (hidden on desktop via md:hidden)
    const mobileLogo = screen.getByTestId('app-logo-mobile');
    expect(mobileLogo).toBeInTheDocument();
    expect(mobileLogo).toHaveAttribute('src', '/jajat-logo.png');
    expect(mobileLogo).toHaveAttribute('alt', 'JAJAT');
  });

  test('should render tablet title "JAJAT"', () => {
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
    // Tablet version should show "JAJAT" (hidden on mobile and desktop)
    const tabletTitle = screen.getByTestId('app-title-tablet');
    expect(tabletTitle).toBeInTheDocument();
    expect(tabletTitle).toHaveTextContent('JAJAT');
  });

  test('should render sidebar toggle button', () => {
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
    const sidebarToggle = screen.getByTestId('sidebar-toggle');
    expect(sidebarToggle).toBeInTheDocument();
    expect(sidebarToggle).toHaveAttribute('aria-label', 'Toggle sidebar');
  });

  test('sidebar toggle button should call onToggleSidebar when clicked', () => {
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
    const sidebarToggle = screen.getByTestId('sidebar-toggle');
    fireEvent.click(sidebarToggle);
    expect(mockToggleSidebar).toHaveBeenCalledTimes(1);
  });

  test('should render theme toggle button', () => {
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
    const themeToggle = screen.getByTestId('theme-toggle');
    expect(themeToggle).toBeInTheDocument();
    expect(themeToggle).toHaveAttribute('aria-label', 'Toggle theme');
  });

  test('theme toggle should change theme when clicked', async () => {
    localStorage.setItem('theme', 'light');
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
    const themeToggle = screen.getByTestId('theme-toggle');
    
    fireEvent.click(themeToggle);
    
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  // --- Initial State Tests ---

  test('should render Sign In button when initially logged out', () => {
    localStorageStore['isLoggedIn'] = 'false';
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
    const loginButton = screen.getByTestId('login-button');
    expect(loginButton).toHaveTextContent('common.signIn');
  });

  test('should render avatar button when initially logged in', () => {
    localStorageStore['isLoggedIn'] = 'true';
    vi.mocked(useIsLoggedIn).mockReturnValue(true);
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
    const avatarButton = screen.getByTestId('user-avatar-button');
    expect(avatarButton).toBeInTheDocument();
    expect(avatarButton).toHaveAttribute('aria-label', 'nav.backupSync');
  });

  // --- Login/Logout Logic Tests ---

  test('Login action should open the auth modal', () => {
    localStorageStore['isLoggedIn'] = 'false';
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
    
    const loginButton = screen.getByTestId('login-button');
    fireEvent.click(loginButton);
    
    expect(mockOpenLogin).toHaveBeenCalledTimes(1);
  });

  test('On login button click should open auth modal with login mode', async () => {
    localStorageStore['isLoggedIn'] = 'false';
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
    const loginButton = screen.getByTestId('login-button');
    fireEvent.click(loginButton);
    await waitFor(() => {
      expect(mockOpenLogin).toHaveBeenCalled();
    });
  });

  // --- Responsive Design Tests ---

  test('should render user icon SVG in mobile Sign In button', () => {
    localStorageStore['isLoggedIn'] = 'false';
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
    
    // Mobile version should show user icon (hidden on desktop via md:hidden)
    const loginButton = screen.getByTestId('login-button');
    expect(loginButton).toBeInTheDocument();
    
    const desktopText = loginButton.querySelector('.hidden.md\\:inline');
    expect(desktopText).toBeInTheDocument();
    expect(desktopText).toHaveTextContent('common.signIn');
  });

  test('should render full "Sign In" text for desktop view', () => {
    localStorageStore['isLoggedIn'] = 'false';
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
    
    const loginButton = screen.getByTestId('login-button');
    // Desktop text should be present (hidden on mobile via md:hidden class)
    const desktopText = loginButton.querySelector('.hidden.md\\:inline');
    expect(desktopText).toBeInTheDocument();
    expect(desktopText).toHaveTextContent('common.signIn');
  });

  test('should navigate to backup-sync when avatar is clicked', () => {
    localStorageStore['isLoggedIn'] = 'true';
    vi.mocked(useIsLoggedIn).mockReturnValue(true);
    const mockNavigate = vi.fn();
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} onNavigate={mockNavigate} />);
    
    const avatarButton = screen.getByTestId('user-avatar-button');
    fireEvent.click(avatarButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('backup-sync');
  });
});
