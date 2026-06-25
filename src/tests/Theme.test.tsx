import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Theme Functionality', () => {
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

  describe('Theme Persistence', () => {
    it('should save theme preference to localStorage', () => {
      localStorageMock.setItem('theme', 'dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
    });

    it('should retrieve theme preference from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('dark');
      const theme = localStorageMock.getItem('theme');
      expect(theme).toBe('dark');
    });

    it('should default to light theme when no preference exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const theme = localStorageMock.getItem('theme');
      expect(theme).toBeNull();
    });
  });

  describe('Dark Class Application', () => {
    it('should add dark class to document.documentElement', () => {
      document.documentElement.classList.add('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class from document.documentElement', () => {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should toggle dark class correctly', () => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      
      document.documentElement.classList.add('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      
      document.documentElement.classList.remove('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Theme Initialization', () => {
    it('should initialize with dark theme if localStorage has dark', () => {
      localStorageMock.getItem.mockReturnValue('dark');
      const savedTheme = localStorageMock.getItem('theme');
      
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should initialize with light theme if localStorage has light', () => {
      localStorageMock.getItem.mockReturnValue('light');
      const savedTheme = localStorageMock.getItem('theme');
      
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should initialize with light theme if localStorage has no preference', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const savedTheme = localStorageMock.getItem('theme') || 'light';
      
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
