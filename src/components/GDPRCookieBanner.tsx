import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  hasConsent,
  storeConsent,
  type ConsentLevel,
} from './GDPRCookieBanner.utils';

interface GDPRCookieBannerProps {
  onConsentChange?: (level: ConsentLevel) => void;
}

const GDPRCookieBanner: React.FC<GDPRCookieBannerProps> = ({ onConsentChange }) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasConsent()) {
        setIsVisible(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleAcceptAll = useCallback(() => {
    storeConsent('all');
    setIsVisible(false);
    onConsentChange?.('all');
  }, [onConsentChange]);

  const handleAcceptEssential = useCallback(() => {
    storeConsent('essential');
    setIsVisible(false);
    onConsentChange?.('essential');
  }, [onConsentChange]);

  if (!isVisible) return null;

  return (
    <dialog
      open
      className="fixed bottom-0 left-0 right-0 z-[55] animate-in slide-in-from-bottom-4 fade-in duration-500"
      aria-modal="true"
      aria-labelledby="cookie-banner-title"
    >
      <div className="mx-4 mb-4 md:mx-auto md:max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Main banner */}
        <div className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 size-10 rounded-full bg-primary/5 dark:bg-primary/10 flex items-center justify-center text-xl">
              🍪
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3
                id="cookie-banner-title"
                className="text-base font-semibold text-foreground mb-1"
              >
                {t('gdpr.title')}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('gdpr.description')}{' '}
                <a
                  href="/privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  {t('common.footer.privacyPolicy')}
                </a>
                {' '}&amp;{' '}
                <a
                  href="/terms.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  {t('common.footer.termsOfUse')}
                </a>
                .
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 md:flex-shrink-0">
              <button
                onClick={handleAcceptEssential}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition whitespace-nowrap"
                type="button"
              >
                {t('gdpr.essentialOnly')}
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm whitespace-nowrap"
                type="button"
              >
                {t('gdpr.acceptAll')}
              </button>
            </div>
          </div>

          {/* Toggle details */}
          <button
            onClick={() => setShowDetails((s) => !s)}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            type="button"
          >
            {showDetails ? t('gdpr.hideDetails') : t('gdpr.showDetails')}
          </button>
        </div>

        {/* Details panel */}
        {showDetails && (
          <div className="border-t border-border px-5 md:px-6 py-4 bg-muted/50 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-foreground">
                    {t('gdpr.essentialCookies')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/5 dark:bg-primary/10 text-primary font-medium">
                    {t('gdpr.alwaysOn')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('gdpr.essentialCookiesDesc')}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-foreground">
                    {t('gdpr.analyticsCookies')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    {t('gdpr.optional')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('gdpr.analyticsCookiesDesc')}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-foreground">
                    {t('gdpr.storageCookies')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/5 dark:bg-primary/10 text-primary font-medium">
                    {t('gdpr.alwaysOn')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('gdpr.storageCookiesDesc')}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-foreground">
                    {t('gdpr.authCookies')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/5 dark:bg-primary/10 text-primary font-medium">
                    {t('gdpr.alwaysOn')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('gdpr.authCookiesDesc')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
};

export default GDPRCookieBanner;
