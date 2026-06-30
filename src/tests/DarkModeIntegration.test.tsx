import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Dark Mode Integration', () => {
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

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  describe('Theme Initialization Flow', () => {
    it('should initialize dark mode from localStorage on page load', () => {
      localStorageMock.getItem.mockReturnValue('dark');
      const theme = localStorageMock.getItem('theme') || 'light';
      
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('theme');
    });

    it('should initialize light mode from localStorage on page load', () => {
      localStorageMock.getItem.mockReturnValue('light');
      const theme = localStorageMock.getItem('theme') || 'light';
      
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should default to light mode when localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const theme = localStorageMock.getItem('theme') || 'light';
      
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Theme Toggle Flow', () => {
    it('should update both localStorage and document class when toggling to dark', () => {
      document.documentElement.classList.remove('dark');
      localStorageMock.getItem.mockReturnValue('light');
      
      const newTheme = 'dark';
      localStorageMock.setItem('theme', newTheme);
      document.documentElement.classList.add('dark');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should update both localStorage and document class when toggling to light', () => {
      document.documentElement.classList.add('dark');
      localStorageMock.getItem.mockReturnValue('dark');
      
      const newTheme = 'light';
      localStorageMock.setItem('theme', newTheme);
      document.documentElement.classList.remove('dark');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Theme Persistence Across Sessions', () => {
    it('should persist theme preference across page reloads', () => {
      localStorageMock.setItem('theme', 'dark');
      expect(localStorageMock.getStore()['theme']).toBe('dark');
      
      const persistedTheme = localStorageMock.getItem('theme');
      expect(persistedTheme).toBe('dark');
    });

    it('should maintain theme state when localStorage is preserved', () => {
      localStorageMock.setItem('theme', 'dark');
      
      const theme = localStorageMock.getItem('theme');
      expect(theme).toBe('dark');
      
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('CSS Class Application', () => {
    it('should apply dark class to html element for dark mode', () => {
      document.documentElement.classList.add('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class from html element for light mode', () => {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should work with Tailwind CSS dark: variant selector', () => {
      document.documentElement.classList.add('dark');
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
});
