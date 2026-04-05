// src/App.tsx
import { useState, useEffect, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AlertProvider } from './components/AlertProvider';
import HomePage from './pages/HomePage';
import OpportunitiesPage from './pages/OpportunitiesPage';
import SettingsPage from './pages/SettingsPage';
import InsightsPage from './pages/InsightsPage';
import SupportPage from './pages/SupportPage';
import SuggestionsViewerPage from './pages/SuggestionsViewerPage';
import GmailScanPage from './pages/GmailScanPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PWAReloadPrompt from './components/PWAReloadPrompt';
import MainLayout from './layouts/MainLayout';
import { useApplicationsStore } from './stores/applicationsStore';
import { useAuthStore } from './stores/authStore';
import { useCloudSync } from './hooks/useCloudSync';

// ⚡ Bolt: Provide a dummy client ID if not present to prevent crash in dev/test environments
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com';

export type PageType = 'landing' | 'applications' | 'opportunities' | 'settings' | 'insights' | 'support' | 'suggestions' | 'login' | 'register' | 'gmail-scan';

const VALID_PAGES: PageType[] = ['landing', 'applications', 'opportunities', 'settings', 'insights', 'support', 'suggestions', 'login', 'register', 'gmail-scan'];

function App() {
  const { checkAuth } = useAuthStore();
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
    checkAuth();
  }, [checkAuth]);

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
        return <InsightsPage />;
      case 'support':
        return <SupportPage onNavigate={setCurrentPage} />;
      case 'suggestions':
        return <SuggestionsViewerPage onNavigate={setCurrentPage} />;
      case 'gmail-scan':
        return <GmailScanPage onNavigate={setCurrentPage} />;
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
          <main id="app-main-landmark">{content}</main>
        ) : (
          <MainLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            {content}
          </MainLayout>
        )}
        <PWAReloadPrompt />
      </AlertProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
