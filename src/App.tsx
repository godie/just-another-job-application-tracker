// src/App.tsx
import { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AlertProvider } from './components/AlertProvider';
import HomePage from './pages/HomePage';
import OpportunitiesPage from './pages/OpportunitiesPage';
import SettingsPage from './pages/SettingsPage';
import InsightsPage from './pages/InsightsPage';
import SupportPage from './pages/SupportPage';
import SuggestionsViewerPage from './pages/SuggestionsViewerPage';
import LandingPage from './pages/LandingPage';
import MainLayout from './layouts/MainLayout';
import { useApplicationsStore } from './stores/applicationsStore';

// ⚡ Bolt: Provide a dummy client ID if not present to prevent crash in dev/test environments
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com';

export type PageType = 'landing' | 'applications' | 'opportunities' | 'settings' | 'insights' | 'support' | 'suggestions';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>(() => {
    // Load page preference from query param or localStorage
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const pageParam = urlParams.get('page') as PageType | null;
      const validPages: PageType[] = ['landing', 'applications', 'opportunities', 'settings', 'insights', 'support', 'suggestions'];

      if (pageParam && validPages.includes(pageParam)) {
        return pageParam;
      }

      const savedPage = localStorage.getItem('currentPage') as PageType | null;
      // If first time visiting, show landing page
      return savedPage || 'landing';
    }
    return 'landing';
  });

  const loadApplications = useApplicationsStore((state) => state.loadApplications);
  const refreshApplications = useApplicationsStore((state) => state.refreshApplications);

  useEffect(() => {
    // Save page preference
    localStorage.setItem('currentPage', currentPage);

    // ⚡ Bolt: Ensure data is loaded when navigating away from landing page
    if (currentPage !== 'landing') {
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
      case 'landing':
        return <LandingPage onNavigate={setCurrentPage} />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  const content = renderPage();

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AlertProvider>
        {currentPage === 'landing' ? (
          content
        ) : (
          <MainLayout currentPage={currentPage} onNavigate={setCurrentPage}>
            {content}
          </MainLayout>
        )}
      </AlertProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
