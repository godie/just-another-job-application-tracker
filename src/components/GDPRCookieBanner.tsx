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

export const GDPRCookieBanner: React.FC<GDPRCookieBannerProps> = ({ onConsentChange }) => {
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
    <div
      className="fixed bottom-0 left-0 right-0 z-[55] animate-in slide-in-from-bottom-4 fade-in duration-500"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-banner-title"
    >
      <div className="mx-4 mb-4 md:mx-auto md:max-w-4xl bg-white dark:bg-earth-800 border border-earth-200 dark:border-earth-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Main banner */}
        <div className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sage-100 dark:bg-sage-900/30 flex items-center justify-center text-xl">
              🍪
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3
                id="cookie-banner-title"
                className="text-base font-semibold text-earth-900 dark:text-earth-100 mb-1"
              >
                {t('gdpr.title')}
              </h3>
              <p className="text-sm text-earth-600 dark:text-earth-400 leading-relaxed">
                {t('gdpr.description')}{' '}
                <a
                  href="/privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sage-600 dark:text-sage-400 hover:underline font-medium"
                >
                  {t('common.footer.privacyPolicy')}
                </a>
                {' '}&amp;{' '}
                <a
                  href="/terms.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sage-600 dark:text-sage-400 hover:underline font-medium"
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
                className="px-4 py-2 rounded-lg text-sm font-medium border border-earth-300 dark:border-earth-600 text-earth-700 dark:text-earth-300 hover:bg-earth-100 dark:hover:bg-earth-700 transition whitespace-nowrap"
                type="button"
              >
                {t('gdpr.essentialOnly')}
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-sage-600 text-white hover:bg-sage-700 transition shadow-sm whitespace-nowrap"
                type="button"
              >
                {t('gdpr.acceptAll')}
              </button>
            </div>
          </div>

          {/* Toggle details */}
          <button
            onClick={() => setShowDetails((s) => !s)}
            className="mt-3 text-xs text-earth-500 hover:text-earth-700 dark:text-earth-400 dark:hover:text-earth-200 underline transition-colors"
            type="button"
          >
            {showDetails ? t('gdpr.hideDetails') : t('gdpr.showDetails')}
          </button>
        </div>

        {/* Details panel */}
        {showDetails && (
          <div className="border-t border-earth-200 dark:border-earth-700 px-5 md:px-6 py-4 bg-earth-50/50 dark:bg-earth-900/20 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-earth-200 dark:border-earth-700 bg-white dark:bg-earth-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-earth-900 dark:text-earth-100">
                    {t('gdpr.essentialCookies')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 font-medium">
                    {t('gdpr.alwaysOn')}
                  </span>
                </div>
                <p className="text-xs text-earth-600 dark:text-earth-400">
                  {t('gdpr.essentialCookiesDesc')}
                </p>
              </div>

              <div className="rounded-lg border border-earth-200 dark:border-earth-700 bg-white dark:bg-earth-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-earth-900 dark:text-earth-100">
                    {t('gdpr.analyticsCookies')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-earth-100 dark:bg-earth-700 text-earth-600 dark:text-earth-400 font-medium">
                    {t('gdpr.optional')}
                  </span>
                </div>
                <p className="text-xs text-earth-600 dark:text-earth-400">
                  {t('gdpr.analyticsCookiesDesc')}
                </p>
              </div>

              <div className="rounded-lg border border-earth-200 dark:border-earth-700 bg-white dark:bg-earth-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-earth-900 dark:text-earth-100">
                    {t('gdpr.storageCookies')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 font-medium">
                    {t('gdpr.alwaysOn')}
                  </span>
                </div>
                <p className="text-xs text-earth-600 dark:text-earth-400">
                  {t('gdpr.storageCookiesDesc')}
                </p>
              </div>

              <div className="rounded-lg border border-earth-200 dark:border-earth-700 bg-white dark:bg-earth-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-earth-900 dark:text-earth-100">
                    {t('gdpr.authCookies')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 font-medium">
                    {t('gdpr.alwaysOn')}
                  </span>
                </div>
                <p className="text-xs text-earth-600 dark:text-earth-400">
                  {t('gdpr.authCookiesDesc')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GDPRCookieBanner;
