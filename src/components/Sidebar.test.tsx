// src/components/Sidebar.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import React from 'react';
import Sidebar from './Sidebar';

// Mock localStorage
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

// Mock getOpportunities
const mockGetOpportunities = vi.fn(() => []);
vi.mock('../utils/localStorage', () => ({
  getOpportunities: () => mockGetOpportunities(),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Reset document.documentElement classes
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
      expect(applicationsButton?.className).toContain('bg-earth-200');
      
      rerender(<Sidebar currentPage="opportunities" onNavigate={mockNavigate} />);
      const opportunitiesButton = screen.getByText('Opportunities').closest('button');
      expect(opportunitiesButton?.className).toContain('bg-earth-200');
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
        // Should not throw error
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
      
      // Wait for the count to update
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
      // Badge should not be present (no span with number)
      const badge = opportunitiesButton?.querySelector('.bg-red-500');
      expect(badge).not.toBeInTheDocument();
    });
  });
});
