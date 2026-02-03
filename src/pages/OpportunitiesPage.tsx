// src/pages/OpportunitiesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import Footer from '../components/Footer';
import { useAlert } from '../components/AlertProvider';
import { 
  convertOpportunityToApplication,
  sanitizeUrl,
  type JobOpportunity 
} from '../utils/localStorage';
import OpportunityForm from '../components/OpportunityForm';
import ConfirmDialog from '../components/ConfirmDialog';
import packageJson from '../../package.json';
import { useOpportunitiesStore } from '../stores/opportunitiesStore';
import { useApplicationsStore } from '../stores/applicationsStore';

import { type PageType } from '../App';

interface OpportunitiesPageContentProps {
  onNavigate?: (page: PageType) => void;
}

const OpportunitiesPageContent: React.FC<OpportunitiesPageContentProps> = () => {
  const { t, i18n } = useTranslation();
  const { showSuccess, showError } = useAlert();
  
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
      
      // Remove opportunity
      deleteOpportunity(opportunity.id);
      
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
      // Use window.postMessage to send to content script
      // Send to same origin for security, but content script will receive it
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
      // Use window.postMessage to send to content script
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

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('opportunities.title')}</h2>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">{t('opportunities.noOpportunities')}</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {t('opportunities.noOpportunitiesDesc')}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <input
                type="text"
                placeholder={t('opportunities.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                <Trans
                  i18nKey="opportunities.showing"
                  values={{ count: filteredOpportunities.length, total: opportunities.length }}
                  components={{ bold: <span className="font-semibold text-gray-700 dark:text-gray-300" /> }}
                />
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('opportunities.table.position')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('opportunities.table.company')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('opportunities.table.location')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('opportunities.table.jobType')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('opportunities.table.posted')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('opportunities.table.captured')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('opportunities.table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredOpportunities.map((opp) => (
                      <tr key={opp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{opp.position}</div>
                          {opp.salary && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{opp.salary}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{opp.company}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">{opp.location || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {opp.jobType || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(opp.postedDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(opp.capturedDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <a
                              href={sanitizeUrl(opp.link)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                              title={t('opportunities.actions.view')}
                            >
                              {t('opportunities.actions.view')}
                            </a>
                            <button
                              onClick={() => handleApply(opp)}
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 font-semibold"
                            >
                              {t('opportunities.actions.apply')}
                            </button>
                            <button
                              onClick={() => handleDelete(opp)}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            >
                              {t('common.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
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

