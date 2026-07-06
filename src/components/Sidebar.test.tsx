import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import React from 'react';
import Sidebar from './Sidebar';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const mockGetOpportunities = vi.fn(() => []);
// Mock the SAME module the production store imports from
// (`src/stores/opportunitiesStore.ts` imports `getOpportunities` from
// `../storage/opportunities`, not `../storage/applications`).
vi.mock('../storage/opportunities', () => ({
  getOpportunities: () => mockGetOpportunities(),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    document.documentElement.classList.remove('dark');
    mockGetOpportunities.mockReturnValue([]);
  });

  describe('Navigation', () => {
    it('renders navigation links', () => {
      const mockNavigate = vi.fn();
      render(<Sidebar currentPage="applications" onNavigate={mockNavigate} />);
      expect(screen.getByText('Applications')).toBeInTheDocument();
      expect(screen.getByText('Opportunities')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Insights')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('renders exactly one lucide-react SVG icon per nav item (icon normalization contract)', () => {
      // Locks the contract that every sidebar Button carries a single
      // icon — prevents future regressions where someone adds a new
      // nav item without an icon (the original inconsistency) or
      // accidentally adds a second SVG (e.g. a duplicated icon span).
      const mockNavigate = vi.fn();
      const { container } = render(<Sidebar currentPage="applications" onNavigate={mockNavigate} />);
      const navButtons = container.querySelectorAll('nav button');
      // 7 nav items defined in the component.
      expect(navButtons.length).toBe(7);
      navButtons.forEach((btn) => {
        const svgs = btn.querySelectorAll('svg');
        expect(svgs.length).toBe(1);
        // classList.contains is robust to class-string formatting
        // changes in lucide-react (only checks for the class token).
        expect(svgs[0].classList.contains('lucide')).toBe(true);
        // Icons are decorative — the Button text label is the
        // accessible name, so the SVG must be hidden from AT.
        expect(svgs[0]).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('renders the Opportunities icon alongside the count badge (icon + badge coexistence)', async () => {
      // Locks the layout contract that the icon and the Badge both
      // render inside the Opportunities Button when count > 0. The
      // Badge is `absolute` positioned so it does not interact with
      // the Button's `gap-2` flex layout — this test guards against
      // a future refactor that accidentally removes the absolute
      // positioning and breaks the visual layout.
      mockGetOpportunities.mockReturnValue([
        { id: '1', position: 'Engineer', company: 'Test' },
      ]);
      const mockNavigate = vi.fn();
      render(<Sidebar currentPage="applications" onNavigate={mockNavigate} />);
      // Icon is present immediately (synchronous render).
      const opportunitiesButton = screen.getByText('Opportunities').closest('button');
      expect(opportunitiesButton).not.toBeNull();
      const svgs = opportunitiesButton!.querySelectorAll('svg');
      expect(svgs.length).toBe(1);
      expect(svgs[0].classList.contains('lucide')).toBe(true);
      // Badge is async (depends on useEffect → loadOpportunities →
      // state update), so the existence + className checks must be
      // wrapped in waitFor or they race the first render. Find the
      // badge by its content (the count "1") rather than by a
      // substring class selector — more semantic and robust to
      // className changes.
      await waitFor(() => {
        const badge = screen.getByText('1');
        expect(badge.classList.contains('absolute')).toBe(true);
      });
    });

    it('highlights the current page', () => {
      const mockNavigate = vi.fn();
      const { rerender } = render(<Sidebar currentPage="applications" onNavigate={mockNavigate} />);
      
      const applicationsButton = screen.getByText('Applications').closest('button');
      expect(applicationsButton).toHaveAttribute('aria-current', 'page');
      expect(applicationsButton?.className).toContain('border-border');

      rerender(<Sidebar currentPage="opportunities" onNavigate={mockNavigate} />);
      const opportunitiesButton = screen.getByText('Opportunities').closest('button');
      expect(opportunitiesButton).toHaveAttribute('aria-current', 'page');
      expect(opportunitiesButton?.className).toContain('border-border');
    });

    it('calls onNavigate when navigation button is clicked', () => {
      const mockNavigate = vi.fn();
      render(<Sidebar currentPage="applications" onNavigate={mockNavigate} />);
      const opportunitiesButton = screen.getByText('Opportunities').closest('button');
      if (opportunitiesButton) {
        fireEvent.click(opportunitiesButton);
        expect(mockNavigate).toHaveBeenCalledWith('opportunities');
      }
    });

    it('does not call onNavigate if prop is not provided', () => {
      render(<Sidebar currentPage="applications" />);
      const opportunitiesButton = screen.getByText('Opportunities').closest('button');
      if (opportunitiesButton) {
        fireEvent.click(opportunitiesButton);
        expect(opportunitiesButton).toBeInTheDocument();
      }
    });
  });

  describe('Opportunities Badge', () => {
    it('displays opportunities count badge when count > 0', async () => {
      mockGetOpportunities.mockReturnValue([
        { id: '1', position: 'Engineer', company: 'Test' },
        { id: '2', position: 'Developer', company: 'Test' },
      ]);

      render(<Sidebar />);

      await waitFor(() => {
        const badge = screen.getByText('2');
        expect(badge).toBeInTheDocument();
      });
    });

    it('displays 9+ when count > 9', async () => {
      const manyOpportunities = Array.from({ length: 15 }, (_, i) => ({
        id: `${i}`,
        position: `Position ${i}`,
        company: 'Test',
      }));
      mockGetOpportunities.mockReturnValue(manyOpportunities);

      render(<Sidebar />);

      await waitFor(() => {
        const badge = screen.getByText('9+');
        expect(badge).toBeInTheDocument();
      });
    });

    it('does not display badge when count is 0', () => {
      mockGetOpportunities.mockReturnValue([]);

      render(<Sidebar />);

      const opportunitiesButton = screen.getByText('Opportunities').closest('button');
      const badge = opportunitiesButton?.querySelector('.bg-red-500');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('M5 audit: reactive state sync (no polling)', () => {
    // Regression guard for the M5 follow-up PR: the 2-second setInterval
    // on `isOpen` was replaced with a `jobOpportunitiesUpdated` CustomEvent
    // listener pair (see AGENTS.md "Reactive state sync"). If a future
    // contributor re-adds the polling, this test fails fast.
    it('does not schedule setInterval during mount (event-driven refresh only)', () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      try {
        render(<Sidebar currentPage="applications" onNavigate={vi.fn()} />);
        expect(setIntervalSpy).not.toHaveBeenCalled();
      } finally {
        setIntervalSpy.mockRestore();
      }
    });
  });
});
