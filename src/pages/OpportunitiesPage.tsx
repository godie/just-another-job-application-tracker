// src/pages/OpportunitiesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';
import { useAlert } from '../components/AlertProvider';
import { 
  convertOpportunityToApplication,
  type JobOpportunity 
} from '../utils/localStorage';
import OpportunityForm from '../components/OpportunityForm';
import ConfirmDialog from '../components/ConfirmDialog';
import ATSSearch from '../components/ATSSearch';
import packageJson from '../../package.json';
import { useOpportunitiesStore } from '../stores/opportunitiesStore';
import { useApplicationsStore } from '../stores/applicationsStore';
import OpportunitiesEmptyState from '../components/OpportunitiesEmptyState';
import OpportunitiesTable from '../components/OpportunitiesTable';
import { useFormatDate } from '../hooks/useFormatDate';

import { type PageType } from '../App';

interface OpportunitiesPageContentProps {
  onNavigate?: (page: PageType) => void;
}

const OpportunitiesPageContent: React.FC<OpportunitiesPageContentProps> = () => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useAlert();
  const { formatLocaleDate } = useFormatDate();
  
  // Use Zustand stores
  const opportunities = useOpportunitiesStore((state) => state.opportunities);
  const loadOpportunities = useOpportunitiesStore((state) => state.loadOpportunities);
  const addOpportunity = useOpportunitiesStore((state) => state.addOpportunity);
  const deleteOpportunity = useOpportunitiesStore((state) => state.deleteOpportunity);
  const refreshOpportunities = useOpportunitiesStore((state) => state.refreshOpportunities);
  
  const addApplication = useApplicationsStore((state) => state.addApplication);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    opportunity: JobOpportunity | null;
  }>({
    isOpen: false,
    opportunity: null,
  });

  useEffect(() => {
    loadOpportunities();
    
    // Listen for storage changes (from Chrome extension)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jobOpportunities' || e.key === null) {
        refreshOpportunities();
      }
    };
    
    // Listen for custom event from webapp-content script
    const handleOpportunitiesUpdate = () => {
      refreshOpportunities();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('jobOpportunitiesUpdated', handleOpportunitiesUpdate as EventListener);
    
    // Also poll for changes (in case extension uses chrome.storage.local)
    const interval = setInterval(() => {
      refreshOpportunities();
    }, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('jobOpportunitiesUpdated', handleOpportunitiesUpdate as EventListener);
      clearInterval(interval);
    };
  }, [loadOpportunities, refreshOpportunities]);

  const handleApply = (opportunity: JobOpportunity) => {
    try {
      // Convert to application
      const application = convertOpportunityToApplication(opportunity);
      
      // Add application using store
      addApplication(application);
      
      // Remove opportunity (same as Delete so extension doesn't re-sync it)
      deleteOpportunity(opportunity.id);
      try {
        window.postMessage({
          type: 'DELETE_OPPORTUNITY',
          opportunityId: opportunity.id,
        }, window.location.origin);
      } catch (error) {
        console.debug('Extension not available for delete sync:', error);
      }
      
      showSuccess(t('opportunities.success.addedToApps', { position: opportunity.position, company: opportunity.company }));
    } catch (error) {
      console.error('Error converting opportunity:', error);
      showError(t('opportunities.success.convertError'));
    }
  };

  const handleDelete = (opportunity: JobOpportunity) => {
    setDeleteConfirm({ isOpen: true, opportunity });
  };

  const confirmDelete = () => {
    if (deleteConfirm.opportunity) {
      const opportunity = deleteConfirm.opportunity;
      deleteOpportunity(opportunity.id);
      
      // Also delete from chrome.storage.local via content script
      try {
        console.log('[Web App] Sending DELETE_OPPORTUNITY message to extension:', opportunity.id);
        window.postMessage({
          type: 'DELETE_OPPORTUNITY',
          opportunityId: opportunity.id,
        }, window.location.origin);
      } catch (error) {
        console.error('Error sending delete message to extension:', error);
      }
      
      showSuccess(t('opportunities.success.deleted', { position: opportunity.position }));
      setDeleteConfirm({ isOpen: false, opportunity: null });
    }
  };

  const handleAddOpportunity = (opportunityData: Omit<JobOpportunity, 'id' | 'capturedDate'>) => {
    try {
      const newOpportunity = addOpportunity(opportunityData);
      showSuccess(t('opportunities.success.added', { position: opportunityData.position, company: opportunityData.company }));
      
      // Also sync to chrome.storage.local if extension is available
      try {
        window.postMessage({
          type: 'SYNC_OPPORTUNITY',
          data: newOpportunity,
        }, window.location.origin);
      } catch (error) {
        // Ignore if extension is not available
        console.debug('Extension not available for sync:', error);
      }
    } catch (error) {
      console.error('Error adding opportunity:', error);
      showError(t('opportunities.success.addError'));
    }
  };

  const filteredOpportunities = useMemo(() => {
    if (!searchTerm.trim()) return opportunities;
    
    const normalized = searchTerm.toLowerCase();
    return opportunities.filter(opp => 
      opp.position.toLowerCase().includes(normalized) ||
      opp.company.toLowerCase().includes(normalized) ||
      opp.location?.toLowerCase().includes(normalized) ||
      opp.jobType?.toLowerCase().includes(normalized)
    );
  }, [opportunities, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto">
        <ATSSearch />

        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('opportunities.title')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('opportunities.subtitle')}
            </p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 transition duration-150"
          >
            {t('opportunities.addOpportunity')}
          </button>
        </div>

        {opportunities.length === 0 ? (
          <OpportunitiesEmptyState />
        ) : (
          <OpportunitiesTable
            opportunities={opportunities}
            filteredOpportunities={filteredOpportunities}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onApply={handleApply}
            onDelete={handleDelete}
            formatDate={formatLocaleDate}
          />
        )}
      <Footer version={packageJson.version} />
      <OpportunityForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleAddOpportunity}
      />
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={t('opportunities.deleteConfirm.title')}
        message={t('opportunities.deleteConfirm.message', {
          position: deleteConfirm.opportunity?.position,
          company: deleteConfirm.opportunity?.company
        })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, opportunity: null })}
      />
    </div>
  );
};

interface OpportunitiesPageProps {
  onNavigate?: (page: PageType) => void;
}

const OpportunitiesPage: React.FC<OpportunitiesPageProps> = ({ onNavigate }) => {
  return <OpportunitiesPageContent onNavigate={onNavigate} />;
};

export default OpportunitiesPage;
