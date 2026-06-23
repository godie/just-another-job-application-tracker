// src/pages/LandingPage.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LandingPage from './LandingPage';

describe('LandingPage', () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the hero title and subtitle', () => {
    render(<LandingPage onNavigate={onNavigate} />);

    expect(screen.getByText('Master Your Job Search')).toBeInTheDocument();
    expect(
      screen.getByText(/The ultimate tool to track applications/)
    ).toBeInTheDocument();
  });

  it('renders Get Started button and navigates on click', () => {
    render(<LandingPage onNavigate={onNavigate} />);

    const getStartedButtons = screen.getAllByText('Get Started');
    expect(getStartedButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(getStartedButtons[0]);
    expect(onNavigate).toHaveBeenCalledWith('applications');
  });

  it('renders Enter Application buttons', () => {
    render(<LandingPage onNavigate={onNavigate} />);

    const enterButtons = screen.getAllByText('Enter Application');
    expect(enterButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Privacy Policy and Terms of Use links', () => {
    render(<LandingPage onNavigate={onNavigate} />);

    const privacyLinks = screen.getAllByText('Privacy Policy');
    expect(privacyLinks.length).toBeGreaterThanOrEqual(1);

    const termsLinks = screen.getAllByText('Terms of Use');
    expect(termsLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('sets the document title via useSEO hook', () => {
    render(<LandingPage onNavigate={onNavigate} />);
    // resolveSEOConfig appends " | JAJAT" suffix
    expect(document.title).toBe('Track Your Job Search — Free & Private | JAJAT');
  });
});
