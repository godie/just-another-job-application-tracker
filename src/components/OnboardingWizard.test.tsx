import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import OnboardingWizard from './OnboardingWizard';
import { hasCompletedOnboarding, markOnboardingComplete } from './OnboardingWizard.utils';

const ONBOARDING_KEY = 'jajat_onboarding_completed';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options && 'number' in options) return `${key} ${options.number}`;
      return key;
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

describe('OnboardingWizard', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the first step with welcome message', async () => {
    const onClose = vi.fn();
    render(<OnboardingWizard onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('onboarding.welcome.title')).toBeInTheDocument();
    });
  });

  it('advances to the next step when clicking Next', async () => {
    const onClose = vi.fn();
    render(<OnboardingWizard onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('onboarding.welcome.title')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /common.next/i }));

    await waitFor(() => {
      expect(screen.getByText('onboarding.applications.title')).toBeInTheDocument();
    });
  });

  it('goes back to the previous step when clicking Previous', async () => {
    const onClose = vi.fn();
    render(<OnboardingWizard onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('onboarding.welcome.title')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /common.next/i }));
    await waitFor(() => {
      expect(screen.getByText('onboarding.applications.title')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /common.previous/i }));
    await waitFor(() => {
      expect(screen.getByText('onboarding.welcome.title')).toBeInTheDocument();
    });
  });

  it('closes and marks complete when clicking Skip tour', async () => {
    const onClose = vi.fn();
    render(<OnboardingWizard onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('onboarding.skip')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('onboarding.skip'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(hasCompletedOnboarding()).toBe(true);
  });

  it('closes after the last step when clicking Start Tracking', () => {
    vi.useFakeTimers();

    const onClose = vi.fn();
    render(<OnboardingWizard onClose={onClose} />);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    for (let i = 0; i < 8; i++) {
      const btn = screen.getByRole('button', { name: /common.next|onboarding.startTracking/i });
      fireEvent.click(btn);
    }

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(hasCompletedOnboarding()).toBe(true);
  });

  it('closes when clicking the backdrop', async () => {
    const onClose = vi.fn();
    render(<OnboardingWizard onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const backdrop = screen.getByRole('dialog').parentElement;
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('closes when pressing the Escape key', async () => {
    const onClose = vi.fn();
    render(<OnboardingWizard onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates to applications page on final step via onNavigate', () => {
    vi.useFakeTimers();

    const onClose = vi.fn();
    const onNavigate = vi.fn();
    render(<OnboardingWizard onClose={onClose} onNavigate={onNavigate} />);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    for (let i = 0; i < 8; i++) {
      const btn = screen.getByRole('button', { name: /common.next|onboarding.startTracking/i });
      fireEvent.click(btn);
    }

    expect(onNavigate).toHaveBeenCalledWith('applications');

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('marks onboarding complete in localStorage', () => {
    expect(hasCompletedOnboarding()).toBe(false);
    markOnboardingComplete();
    expect(hasCompletedOnboarding()).toBe(true);
    expect(localStorage.getItem(ONBOARDING_KEY)).toBe('true');
  });

  it('renders progress dots for all steps', async () => {
    const onClose = vi.fn();
    render(<OnboardingWizard onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dots = screen.getAllByRole('button', { name: /onboarding.step/i });
    expect(dots).toHaveLength(8);
  });

  it('allows jumping to a step by clicking a dot', async () => {
    const onClose = vi.fn();
    render(<OnboardingWizard onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('onboarding.welcome.title')).toBeInTheDocument();
    });

    const dots = screen.getAllByRole('button', { name: /onboarding.step/i });
    fireEvent.click(dots[3]); // Jump to step 4 (Views)

    await waitFor(() => {
      expect(screen.getByText('onboarding.views.title')).toBeInTheDocument();
    });
  });
});
