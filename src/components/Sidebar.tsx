import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Sparkles,
  Cloud,
  CloudUpload,
  Settings,
  BarChart3,
  HelpCircle,
  Home,
} from 'lucide-react';
import { type PageType } from '../App';
import { useIsLoggedIn } from '../hooks/useIsLoggedIn';
import { useOpportunitiesStore } from '../stores/opportunitiesStore';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

// User-facing label is "Home" (the public landing page) but the
// internal route key is the legacy 'landing' name. Renaming the
// route would touch URL params, localStorage, and the App.tsx
// switch — the alias keeps the change minimal and self-documenting.
const HOME_ROUTE: PageType = 'landing';

interface SidebarProps {
  currentPage?: PageType;
  onNavigate?: (page: PageType) => void;
  isOpen?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage = 'applications', onNavigate, isOpen = true }) => {
  const { t } = useTranslation();
  const isLoggedIn = useIsLoggedIn();
  const opportunities = useOpportunitiesStore((state) => state.opportunities);
  const loadOpportunities = useOpportunitiesStore((state) => state.loadOpportunities);
  const refreshOpportunities = useOpportunitiesStore((state) => state.refreshOpportunities);
  const opportunitiesCount = opportunities.length;

  // Two refresh mechanisms, each covering a different source of
  // staleness — NOT redundant:
  //   1. `storage` event fires cross-tab only (not in the writing tab).
  //   2. Polling catches same-tab writes from non-React code paths
  //      that bypass the Zustand store. Gated on `isOpen` so a
  //      closed sidebar doesn't burn CPU.
  useEffect(() => {
    loadOpportunities();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jobOpportunities' || e.key === null) {
        refreshOpportunities();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadOpportunities, refreshOpportunities]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(refreshOpportunities, 2000);
    return () => clearInterval(interval);
  }, [isOpen, refreshOpportunities]);

  const handleNavigation = (page: PageType) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  // Backup & Sync icon reflects auth state: plain cloud when signed out
  // (data lives only in this browser), upload cloud when signed in
  // (data is being pushed to the cloud). Inline (not a separate
  // SyncNavIcon component) so the sidebar uses a single icon library.
  const SyncIcon = isLoggedIn ? CloudUpload : Cloud;

  const navItems: { page: PageType; label: string; showBadge?: boolean; icon: React.ReactNode }[] = [
    { page: 'applications', label: t('nav.applications'), icon: <Briefcase aria-hidden="true" /> },
    { page: 'opportunities', label: t('nav.opportunities'), icon: <Sparkles aria-hidden="true" />, showBadge: true },
    { page: 'backup-sync', label: t('nav.backupSync'), icon: <SyncIcon aria-hidden="true" /> },
    { page: 'settings', label: t('nav.settings'), icon: <Settings aria-hidden="true" /> },
    { page: 'insights', label: t('nav.insights'), icon: <BarChart3 aria-hidden="true" /> },
    { page: 'support', label: t('nav.support'), icon: <HelpCircle aria-hidden="true" /> },
    { page: HOME_ROUTE, label: t('nav.home'), icon: <Home aria-hidden="true" /> },
  ];

  return (
    <nav
      aria-label='Main navigation'
      // `text-foreground` on the <nav> is defense-in-depth for the
      // ghost variant (no default text color) — see dark-mode
      // visibility regression history.
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card text-foreground border-r border-border p-4 flex flex-col transition-transform duration-300 ease-in-out z-40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } w-64`}
    >
      <ul className='flex-1'>
        {navItems.map((item) => (
          <li key={item.page} className='mb-4'>
            <Button
              variant={currentPage === item.page ? 'secondary' : 'ghost'}
              size='lg'
              onClick={() => handleNavigation(item.page)}
              aria-current={currentPage === item.page ? 'page' : undefined}
              className={`w-full justify-start text-base relative ${
                // Pin hover:bg-secondary so the variant's
                // `hover:bg-secondary/80` does not darken the
                // already-selected item on hover. (shadow-sm is
                // already provided by the secondary variant.)
                currentPage === item.page
                  ? 'border border-border hover:bg-secondary'
                  : ''
              }`}
            >
              {item.icon}
              {item.label}
              {item.showBadge && opportunitiesCount > 0 && (
                <Badge
                  variant='danger'
                  className='absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center rounded-full font-bold'
                >
                  {opportunitiesCount > 9 ? '9+' : opportunitiesCount}
                </Badge>
              )}
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Sidebar;
