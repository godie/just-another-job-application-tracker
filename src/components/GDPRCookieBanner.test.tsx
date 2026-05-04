import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GDPRCookieBanner from './GDPRCookieBanner';
import {
  getStoredConsent,
  hasConsent,
  storeConsent,
  clearConsent,
} from './GDPRCookieBanner.utils';

const COOKIE_CONSENT_KEY = 'jajat_cookie_consent_v1';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

describe('GDPRCookieBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the banner when no consent is stored', async () => {
    const onConsentChange = vi.fn();
    render(<GDPRCookieBanner onConsentChange={onConsentChange} />);

    await waitFor(() => {
      expect(screen.getByText('gdpr.title')).toBeInTheDocument();
    });
    expect(screen.getByText(/gdpr.description/)).toBeInTheDocument();
  });

  it('does not render when consent is already stored', () => {
    storeConsent('essential');
    const onConsentChange = vi.fn();
    const { container } = render(<GDPRCookieBanner onConsentChange={onConsentChange} />);

    expect(container.firstChild).toBeNull();
  });

  it('hides banner and stores essential consent when clicking Essential Only', async () => {
    const onConsentChange = vi.fn();
    render(<GDPRCookieBanner onConsentChange={onConsentChange} />);

    await waitFor(() => {
      expect(screen.getByText('gdpr.essentialOnly')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('gdpr.essentialOnly'));

    await waitFor(() => {
      expect(screen.queryByText('gdpr.title')).not.toBeInTheDocument();
    });

    expect(hasConsent()).toBe(true);
    const stored = getStoredConsent();
    expect(stored?.level).toBe('essential');
    expect(onConsentChange).toHaveBeenCalledWith('essential');
  });

  it('hides banner and stores all consent when clicking Accept All', async () => {
    const onConsentChange = vi.fn();
    render(<GDPRCookieBanner onConsentChange={onConsentChange} />);

    await waitFor(() => {
      expect(screen.getByText('gdpr.acceptAll')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('gdpr.acceptAll'));

    await waitFor(() => {
      expect(screen.queryByText('gdpr.title')).not.toBeInTheDocument();
    });

    expect(hasConsent()).toBe(true);
    const stored = getStoredConsent();
    expect(stored?.level).toBe('all');
    expect(onConsentChange).toHaveBeenCalledWith('all');
  });

  it('shows cookie details when clicking show details', async () => {
    render(<GDPRCookieBanner />);

    await waitFor(() => {
      expect(screen.getByText('gdpr.showDetails')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('gdpr.showDetails'));

    await waitFor(() => {
      expect(screen.getByText('gdpr.essentialCookies')).toBeInTheDocument();
      expect(screen.getByText('gdpr.analyticsCookies')).toBeInTheDocument();
      expect(screen.getByText('gdpr.storageCookies')).toBeInTheDocument();
      expect(screen.getByText('gdpr.authCookies')).toBeInTheDocument();
    });
  });

  it('hides details when clicking hide details', async () => {
    render(<GDPRCookieBanner />);

    await waitFor(() => {
      expect(screen.getByText('gdpr.showDetails')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('gdpr.showDetails'));
    await waitFor(() => {
      expect(screen.getByText('gdpr.hideDetails')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('gdpr.hideDetails'));
    await waitFor(() => {
      expect(screen.queryByText('gdpr.essentialCookies')).not.toBeInTheDocument();
    });
  });

  it('links to privacy policy and terms of use', async () => {
    render(<GDPRCookieBanner />);

    await waitFor(() => {
      expect(screen.getByText('common.footer.privacyPolicy')).toBeInTheDocument();
    });

    const privacyLink = screen.getByText('common.footer.privacyPolicy').closest('a');
    expect(privacyLink).toHaveAttribute('href', '/privacy.html');
    expect(privacyLink).toHaveAttribute('target', '_blank');

    const termsLink = screen.getByText('common.footer.termsOfUse').closest('a');
    expect(termsLink).toHaveAttribute('href', '/terms.html');
    expect(termsLink).toHaveAttribute('target', '_blank');
  });

  it('stores consent with ISO timestamp', () => {
    const before = Date.now();
    storeConsent('all');
    const after = Date.now();

    const stored = getStoredConsent();
    expect(stored).not.toBeNull();
    expect(stored?.level).toBe('all');
    const storedTime = new Date(stored!.timestamp).getTime();
    expect(storedTime).toBeGreaterThanOrEqual(before);
    expect(storedTime).toBeLessThanOrEqual(after);
  });

  it('clears consent from localStorage', () => {
    storeConsent('essential');
    expect(hasConsent()).toBe(true);
    clearConsent();
    expect(hasConsent()).toBe(false);
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBeNull();
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'not-json');
    expect(getStoredConsent()).toBeNull();
    expect(hasConsent()).toBe(false);
  });

  it('has correct ARIA attributes', async () => {
    render(<GDPRCookieBanner />);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'cookie-banner-title');
    });
  });
});
