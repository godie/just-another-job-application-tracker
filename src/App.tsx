import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
// react-doctor-disable-next-line no-flush-sync,react-doctor/no-flush-sync -- preserve the synchronous commit required to capture the post-navigation DOM in the browser View Transitions callback.
import { flushSync } from 'react-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AlertProvider } from './components/AlertProvider';
import LandingPage from './pages/LandingPage';

const HomePage = lazy(() => import('./pages/HomePage'));
const OpportunitiesPage = lazy(() => import('./pages/OpportunitiesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const SuggestionsViewerPage = lazy(() => import('./pages/SuggestionsViewerPage'));
const GmailScanPage = lazy(() => import('./pages/GmailScanPage'));
const BackupSyncPage = lazy(() => import('./pages/BackupSyncPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const JobDetailsPage = lazy(() => import('./pages/JobDetailsPage'));

import PWAReloadPrompt from './components/PWAReloadPrompt';
import MergePromptHandler from './components/sync/MergePromptHandler';
import MainLayout from './layouts/MainLayout';
import KeyboardHelp from './components/KeyboardHelp';

import OnboardingWizard from './components/OnboardingWizard';
import { hasCompletedOnboarding } from './components/OnboardingWizard.utils';
import GDPRCookieBanner from './components/GDPRCookieBanner';
import { hasConsent } from './components/GDPRCookieBanner.utils';

import { useApplicationsStore } from './stores/applicationsStore';
import { useAuthStore } from './stores/authStore';
import { useCloudSync } from './hooks/useCloudSync';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import { useTranslation } from 'react-i18next';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export type PageType = 'landing' | 'applications' | 'opportunities' | 'settings' | 'insights' | 'support' | 'suggestions' | 'login' | 'register' | 'gmail-scan' | 'backup-sync' | 'job-details';

const VALID_PAGES: PageType[] = ['landing', 'applications', 'opportunities', 'settings', 'insights', 'support', 'suggestions', 'login', 'register', 'gmail-scan', 'backup-sync', 'job-details'];
const PUBLIC_PAGES = new Set<PageType>(['landing', 'login', 'register']);
const PAGE_ANNOUNCEMENT_KEYS: Record<PageType, string> = {
  landing: 'nav.home',
  applications: 'nav.applications',
  opportunities: 'nav.opportunities',
  settings: 'nav.settings',
  insights: 'nav.insights',
  support: 'nav.support',
  suggestions: 'support.suggestionsViewer.title',
  login: 'auth.login',
  register: 'auth.register',
  'gmail-scan': 'settings.emailScan.section',
  'backup-sync': 'nav.backupSync',
  'job-details': 'jobDetails.details',
};

function swapWithTransition(swap: () => void): void {
  if (
    typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function'
  ) {
    // react-doctor-disable-next-line no-document-start-view-transition,react-doctor/no-document-start-view-transition -- preserve the browser View Transitions API for route changes; React 19 has no stable cross-browser replacement for this integration yet.
    document.startViewTransition(() => {
      flushSync(swap);
    });
    return;
  }
  swap();
}

const getPageFromUrl = (): PageType | null => {
  if (typeof window === 'undefined') return 'landing';
  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get('page') as PageType | null;
  if (pageParam && VALID_PAGES.includes(pageParam)) {
    return pageParam;
  }
  return null;
};

function App() {
  const { t } = useTranslation();
  const { fetchMe } = useAuthStore();
  useCloudSync();

  const [currentPage, setCurrentPage] = useState<PageType>(() => {
    const pageFromUrl = getPageFromUrl();
    if (pageFromUrl) return pageFromUrl;

    if (typeof window !== 'undefined') {
      const savedPage = localStorage.getItem('currentPage') as PageType | null;
      return savedPage && VALID_PAGES.includes(savedPage) ? savedPage : 'landing';
    }
    return 'landing';
  });

  const refreshApplications = useApplicationsStore((state) => state.refreshApplications);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Production-only Web Vitals instrument. Dynamic import inside the PROD
  // gate so Vite chunk-splits `web-vitals` into a code-split that ships
  // zero bytes in dev/test bundles, AND vitest never executes the
  // `src/lib/perf.ts` module (which would otherwise pull in `web-vitals`
  // during module-graph resolution).
  useEffect(() => {
    if (import.meta.env.PROD) {
      import('./lib/perf').then((m) => {
        m.startProductionVitalsLogging();
        m.enableLogfireReporter();
      });
    }
  }, []);

  const navigateToPage = useCallback((nextPage: PageType, historyMode: 'push' | 'replace' | 'skip' = 'push') => {
    // Bookkeeping first — synchronous, decoupled from React's commit
    // boundary. Side effects don't belong inside flushSync's callback.
    if (historyMode !== 'skip') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('page') !== nextPage) {
        url.searchParams.set('page', nextPage);
        const method = historyMode === 'replace' ? 'replaceState' : 'pushState';
        window.history[method]({ page: nextPage }, '', url.toString());
      }
    }

    if (!PUBLIC_PAGES.has(nextPage)) {
      localStorage.setItem('currentPage', nextPage);
    }

    // React commit last, animated by the View Transitions API when available.
    swapWithTransition(() => {
      setCurrentPage(nextPage);
    });
  }, []);

  const currentPageRef = useRef(currentPage);
  const initialPageRef = useRef(currentPage);
  const routeAnnouncement = currentPage === initialPageRef.current
    ? ''
    : t(PAGE_ANNOUNCEMENT_KEYS[currentPage]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    const mainId = PUBLIC_PAGES.has(currentPage) ? 'app-main-landmark' : 'main-content';
    document.getElementById(mainId)?.focus();
  }, [currentPage, t]);

  useEffect(() => {
    const handlePopState = () => {
      const pageFromUrl = getPageFromUrl();
      if (pageFromUrl && pageFromUrl !== currentPageRef.current) {
        // Bookkeeping first, then commit.
        if (!PUBLIC_PAGES.has(pageFromUrl)) {
          localStorage.setItem('currentPage', pageFromUrl);
        }
        swapWithTransition(() => {
          setCurrentPage(pageFromUrl);
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding());

  const handleConsentChange = useCallback(() => {
  }, []);

  const handleOnboardingClose = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  const handleOnboardingNavigate = useCallback((page: string) => {
    if (VALID_PAGES.includes(page as PageType)) {
      navigateToPage(page as PageType);
    }
    setShowOnboarding(false);
  }, [navigateToPage]);

  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  useKeyboardShortcuts({
    onSearchFocus: () => {
      const searchInput = document.querySelector('[data-testid="search-input"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    },
    onNewEntry: () => {
      if (currentPage !== 'applications') {
        navigateToPage('applications');
      }
      window.dispatchEvent(new CustomEvent('triggerNewEntry'));
    },
    onShowHelp: () => {
      setShowKeyboardHelp(true);
    },
    enabled: !showOnboarding, // Disable when onboarding is open
  });

  useEffect(() => {
    const handleApplicationsUpdated = () => {
      refreshApplications();
    };
    window.addEventListener('jobApplicationsUpdated', handleApplicationsUpdated);
    return () => window.removeEventListener('jobApplicationsUpdated', handleApplicationsUpdated);
  }, [refreshApplications]);

  const renderPage = () => {
    switch (currentPage) {
      case 'applications':
        return <HomePage onNavigate={navigateToPage} />;
      case 'opportunities':
        return <OpportunitiesPage onNavigate={navigateToPage} />;
      case 'settings':
        return <SettingsPage onNavigate={navigateToPage} />;
      case 'insights':
        return <InsightsPage onNavigate={navigateToPage} />;
      case 'support':
        return <SupportPage onNavigate={navigateToPage} />;
      case 'suggestions':
        return <SuggestionsViewerPage onNavigate={navigateToPage} />;
      case 'gmail-scan':
        return <GmailScanPage onNavigate={navigateToPage} />;
      case 'backup-sync':
        return <BackupSyncPage onNavigate={navigateToPage} />;
      case 'job-details':
        return <JobDetailsPage onNavigate={navigateToPage} />;

      case 'landing':
        return <LandingPage onNavigate={navigateToPage} />;
      case 'login':
        return <LoginPage onNavigate={(page) => navigateToPage(page as PageType)} />;
      case 'register':
        return <RegisterPage onNavigate={(page) => navigateToPage(page as PageType)} />;
      default:
        return <HomePage onNavigate={navigateToPage} />;
    }
  };

  const content = renderPage();

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AlertProvider>
        {['landing', 'login', 'register'].includes(currentPage) ? (
          <main id="app-main-landmark" tabIndex={-1}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-screen bg-muted dark:bg-muted">
                <div className="animate-spin rounded-full size-12 border-b-2 border-primary"></div>
              </div>
            }>
              {content}
            </Suspense>
          </main>
        ) : (
          <MainLayout currentPage={currentPage} onNavigate={navigateToPage}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full size-8 border-b-2 border-primary"></div>
              </div>
            }>
              {content}
            </Suspense>
          </MainLayout>
        )}
        <MergePromptHandler />
        <PWAReloadPrompt />
        {showOnboarding && (
          <OnboardingWizard onClose={handleOnboardingClose} onNavigate={handleOnboardingNavigate} />
        )}
        {!showOnboarding && !hasConsent() && (
          <GDPRCookieBanner onConsentChange={handleConsentChange} />
        )}
        <KeyboardHelp isOpen={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
        <output className="sr-only" aria-live="polite" aria-atomic="true">
          {routeAnnouncement}
        </output>
      </AlertProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
