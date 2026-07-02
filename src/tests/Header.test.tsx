import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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



const localStorageStore: Record<string, string> = {};

vi.mock('../utils/api', () => ({
  setAuthCookieWithCode: vi.fn(() => Promise.resolve({ success: true })),
  clearAuthCookie: vi.fn(() => Promise.resolve({ success: true })),
  getAuthCookie: vi.fn(),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<AlertProvider>{ui}</AlertProvider>);
};

const mockToggleSidebar = vi.fn();

vi.mock('../hooks/useIsLoggedIn', () => ({
  useIsLoggedIn: vi.fn(),
}));

vi.mock('../storage/applications', () => ({
  getApplications: vi.fn(() => []),
  saveApplications: vi.fn(),
  getOpportunities: vi.fn(() => []),
}));

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


describe('Header Component', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
    localStorageStore['isLoggedIn'] = 'false'; // Default to logged out
    vi.mocked(useIsLoggedIn).mockReturnValue(false);
    mockOpenLogin.mockClear();
    mockToggleSidebar.mockClear();
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });

  test('should render the application title (desktop version)', () => {
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
    const desktopTitle = screen.getByTestId('app-title');
    expect(desktopTitle).toBeInTheDocument();
    expect(desktopTitle).toHaveTextContent('Just Another Job Application Tracker');
  });

  test('should render mobile logo image', () => {
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
    const mobileLogo = screen.getByTestId('app-logo-mobile');
    // After the asset replacement, the mobile logo is a <picture> wrapper that
    // emits AVIF + WebP sources and a WebP <img> fallback. Verify the picture
    // exists, the AVIF source is declared first (best-compression first), and
    // the WebP <img> fallback carries the readable alt + 80x80 intrinsic dims.
    expect(mobileLogo).toBeInTheDocument();
    expect(mobileLogo.tagName).toBe('PICTURE');
    const avifSource = mobileLogo.querySelector('source[type="image/avif"]');
    expect(avifSource).not.toBeNull();
    expect(avifSource!.getAttribute('srcset')).toBe('/avatar-80.avif');
    const fallbackImg = mobileLogo.querySelector('img');
    expect(fallbackImg).not.toBeNull();
    expect(fallbackImg!.getAttribute('src')).toBe('/avatar-80.webp');
    expect(fallbackImg!.getAttribute('alt')).toBe(
      'Just Another Job Application Tracker - Home',
    );
    expect(fallbackImg!.getAttribute('width')).toBe('80');
    expect(fallbackImg!.getAttribute('height')).toBe('80');
  });

  test('should render tablet title "JAJAT"', () => {
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
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


  test('should render user icon SVG in mobile Sign In button', () => {
    localStorageStore['isLoggedIn'] = 'false';
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} />);
    
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
    const desktopText = loginButton.querySelector('.hidden.md\\:inline');
    expect(desktopText).toBeInTheDocument();
    expect(desktopText).toHaveTextContent('common.signIn');
  });

  test('should navigate to backup-sync when avatar menu item is clicked', async () => {
    localStorageStore['isLoggedIn'] = 'true';
    vi.mocked(useIsLoggedIn).mockReturnValue(true);
    const mockNavigate = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Header onToggleSidebar={mockToggleSidebar} onNavigate={mockNavigate} />);

    const avatarButton = screen.getByTestId('user-avatar-button');
    await user.click(avatarButton);

    const menuItems = await screen.findAllByText('nav.backupSync');
    const menuItem = menuItems.find((el) => el.getAttribute('role') === 'menuitem');
    if (menuItem) {
      await user.click(menuItem);
    }

    expect(mockNavigate).toHaveBeenCalledWith('backup-sync');
  });
});
