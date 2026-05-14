// src/App.tsx
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AlertProvider } from './components/AlertProvider';
import LandingPage from './pages/LandingPage';

// Lazy-load all non-landing pages to reduce initial bundle size
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

// Google OAuth client ID - must be set via VITE_GOOGLE_CLIENT_ID environment variable
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export type PageType = 'landing' | 'applications' | 'opportunities' | 'settings' | 'insights' | 'support' | 'suggestions' | 'login' | 'register' | 'gmail-scan' | 'backup-sync';

const VALID_PAGES: PageType[] = ['landing', 'applications', 'opportunities', 'settings', 'insights', 'support', 'suggestions', 'login', 'register', 'gmail-scan', 'backup-sync'];

function App() {
  const { fetchMe } = useAuthStore();
  useCloudSync();

  const getPageFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return 'landing';
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page') as PageType | null;
    if (pageParam && VALID_PAGES.includes(pageParam)) {
      return pageParam;
    }
    return null;
  }, []);

  const [currentPage, setCurrentPage] = useState<PageType>(() => {
    const pageFromUrl = getPageFromUrl();
    if (pageFromUrl) return pageFromUrl;

    if (typeof window !== 'undefined') {
      const savedPage = localStorage.getItem('currentPage') as PageType | null;
      return savedPage && VALID_PAGES.includes(savedPage) ? savedPage : 'landing';
    }
    return 'landing';
  });

  const loadApplications = useApplicationsStore((state) => state.loadApplications);
  const refreshApplications = useApplicationsStore((state) => state.refreshApplications);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const pageFromUrl = getPageFromUrl();
      if (pageFromUrl && pageFromUrl !== currentPage) {
        setCurrentPage(pageFromUrl);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentPage, getPageFromUrl]);

  // Sync state with URL and localStorage
  useEffect(() => {
    // Update URL without full page reload
    const url = new URL(window.location.href);
    if (url.searchParams.get('page') !== currentPage) {
      url.searchParams.set('page', currentPage);
      window.history.pushState({ page: currentPage }, '', url.toString());
    }

    // Save page preference
    if (currentPage !== 'login' && currentPage !== 'register') {
      localStorage.setItem('currentPage', currentPage);
    }

    // ⚡ Bolt: Ensure data is loaded when navigating away from landing page
    if (currentPage !== 'landing' && currentPage !== 'login' && currentPage !== 'register') {
      loadApplications();
    }
  }, [currentPage, loadApplications]);

  // Onboarding + GDPR banner state
  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding());

  const handleConsentChange = useCallback(() => {
    // No-op: GDPRCookieBanner persists consent directly to localStorage.
    // Analytics or additional tracking could be enabled here in the future.
  }, []);

  const handleOnboardingClose = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  const handleOnboardingNavigate = useCallback((page: string) => {
    if (VALID_PAGES.includes(page as PageType)) {
      setCurrentPage(page as PageType);
    }
    setShowOnboarding(false);
  }, []);

  // Keyboard shortcuts help modal
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onSearchFocus: () => {
      // Focus search input if on applications page
      const searchInput = document.querySelector('[data-testid="search-input"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    },
    onNewEntry: () => {
      // Navigate to applications and trigger new entry
      if (currentPage !== 'applications') {
        setCurrentPage('applications');
      }
      // Dispatch custom event that HomePage can listen to
      window.dispatchEvent(new CustomEvent('triggerNewEntry'));
    },
    onShowHelp: () => {
      setShowKeyboardHelp(true);
    },
    enabled: !showOnboarding, // Disable when onboarding is open
  });

  // Listen for applications added from Chrome extension (e.g. "Save as Application")
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
        return <HomePage onNavigate={setCurrentPage} />;
      case 'opportunities':
        return <OpportunitiesPage onNavigate={setCurrentPage} />;
      case 'settings':
        return <SettingsPage onNavigate={setCurrentPage} />;
      case 'insights':
        return <InsightsPage onNavigate={setCurrentPage} />;
      case 'support':
        return <SupportPage onNavigate={setCurrentPage} />;
      case 'suggestions':
        return <SuggestionsViewerPage onNavigate={setCurrentPage} />;
      case 'gmail-scan':
        return <GmailScanPage onNavigate={setCurrentPage} />;
      case 'backup-sync':
        return <BackupSyncPage onNavigate={setCurrentPage} />;

      case 'landing':
        return <LandingPage onNavigate={setCurrentPage} />;
      case 'login':
        return <LoginPage onNavigate={(page) => setCurrentPage(page as PageType)} />;
      case 'register':
        return <RegisterPage onNavigate={(page) => setCurrentPage(page as PageType)} />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  const content = renderPage();

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AlertProvider>
        {['landing', 'login', 'register'].includes(currentPage) ? (
          <main id="app-main-landmark">
            <Suspense fallback={
              <div className="flex items-center justify-center h-screen bg-earth-100 dark:bg-earth-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
              </div>
            }>
              {content}
            </Suspense>
          </main>
        ) : (
          <MainLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-600"></div>
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
      </AlertProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
