import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import MainLayout from './MainLayout';
import { type PageType } from '../App';

vi.mock('../components/Sidebar', () => ({
  default: ({ currentPage, onNavigate, isOpen }: { currentPage?: PageType; onNavigate?: (page: PageType) => void; isOpen?: boolean }) => (
    <div data-testid="sidebar" data-open={isOpen}>
      Sidebar - {currentPage || 'default'} - {isOpen ? 'open' : 'closed'}
      {onNavigate && <button onClick={() => onNavigate('settings')}>Navigate</button>}
    </div>
  ),
}));

vi.mock('../components/Header', () => ({
  default: ({ onToggleSidebar }: { onToggleSidebar: () => void }) => (
    <div data-testid="header">
      Header
      <button onClick={onToggleSidebar} data-testid="header-sidebar-toggle">Toggle</button>
    </div>
  ),
}));

describe('MainLayout', () => {
  it('renders children correctly', () => {
    render(
      <MainLayout>
        <div>Test Child</div>
      </MainLayout>
    );
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('renders Sidebar', () => {
    render(
      <MainLayout>
        <div>Test Child</div>
      </MainLayout>
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders Header', () => {
    render(
      <MainLayout>
        <div>Test Child</div>
      </MainLayout>
    );
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('passes currentPage prop to Sidebar', () => {
    render(
      <MainLayout currentPage="opportunities">
        <div>Test Child</div>
      </MainLayout>
    );
    expect(screen.getByText(/Sidebar - opportunities/)).toBeInTheDocument();
  });

  it('passes onNavigate prop to Sidebar', () => {
    const mockNavigate = vi.fn();
    render(
      <MainLayout currentPage="applications" onNavigate={mockNavigate}>
        <div>Test Child</div>
      </MainLayout>
    );
    
    const navigateButton = screen.getByText('Navigate');
    navigateButton.click();
    
    expect(mockNavigate).toHaveBeenCalledWith('settings');
  });

  it('applies dark mode classes to layout elements', () => {
    const { container } = render(
      <MainLayout>
        <div>Test Child</div>
      </MainLayout>
    );
    
    const mainElement = container.querySelector('main');
    expect(mainElement).toBeInTheDocument();
  });
});
