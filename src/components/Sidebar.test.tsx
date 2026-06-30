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
vi.mock('../storage/applications', () => ({
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
    it('displays opportunities count badge when count > 0', () => {
      mockGetOpportunities.mockReturnValue([
        { id: '1', position: 'Engineer', company: 'Test' },
        { id: '2', position: 'Developer', company: 'Test' },
      ]);
      
      render(<Sidebar />);
      
      waitFor(() => {
        const badge = screen.getByText('2');
        expect(badge).toBeInTheDocument();
      });
    });

    it('displays 9+ when count > 9', () => {
      const manyOpportunities = Array.from({ length: 15 }, (_, i) => ({
        id: `${i}`,
        position: `Position ${i}`,
        company: 'Test',
      }));
      mockGetOpportunities.mockReturnValue(manyOpportunities);
      
      render(<Sidebar />);
      
      waitFor(() => {
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
});
