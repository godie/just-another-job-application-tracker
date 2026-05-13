import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MainLayout from '../../layouts/MainLayout';
import { AlertProvider } from '../../components/AlertProvider';

/**
 * Accessibility tests for MainLayout component
 * These tests verify landmark navigation and skip links
 */
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<AlertProvider>{ui}</AlertProvider>);
};

describe('MainLayout Accessibility', () => {
  it('renders skip navigation link', () => {
    renderWithProvider(
      <MainLayout currentPage="applications">
        <div>Test content</div>
      </MainLayout>
    );

    // The skip link is visually hidden but present in DOM
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink.tagName.toLowerCase()).toBe('a');
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('main content has landmark role', () => {
    renderWithProvider(
      <MainLayout currentPage="applications">
        <div>Test content</div>
      </MainLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('id', 'main-content');
  });

  it('main content has negative tabindex for focus management', () => {
    renderWithProvider(
      <MainLayout currentPage="applications">
        <div>Test content</div>
      </MainLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('tabIndex', '-1');
  });

  it('sidebar has navigation landmark', () => {
    renderWithProvider(
      <MainLayout currentPage="applications">
        <div>Test content</div>
      </MainLayout>
    );

    const navigation = screen.getByRole('navigation', { name: /main navigation/i });
    expect(navigation).toBeInTheDocument();
  });

  it('header has banner landmark', () => {
    renderWithProvider(
      <MainLayout currentPage="applications">
        <div>Test content</div>
      </MainLayout>
    );

    const banner = screen.getByRole('banner');
    expect(banner).toBeInTheDocument();
  });
});
