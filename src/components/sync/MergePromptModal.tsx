// src/components/sync/MergePromptModal.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMergeStore } from '../../stores/mergeStore';
import { useApplicationsStore } from '../../stores/applicationsStore';
import { useOpportunitiesStore } from '../../stores/opportunitiesStore';
import { resolveMerge, type MergeStrategy, type MergeData } from '../../utils/mergeData';
import { markInitialLoadDone } from '../../hooks/useCloudSync';

interface MergePromptModalProps {
  onClose?: () => void;
}

const MergePromptModal: React.FC<MergePromptModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [isResolving, setIsResolving] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<MergeStrategy | null>(null);

  const { localData, cloudData, clearConflict, resumeSync } = useMergeStore();
  const setApplications = useApplicationsStore((state) => state.setApplications);
  const setOpportunities = useOpportunitiesStore((state) => state.setOpportunities);

  if (!localData || !cloudData) return null;

  const localAppCount = localData.applications.length;
  const localOppCount = localData.opportunities.length;
  const cloudAppCount = cloudData.applications.length;
  const cloudOppCount = cloudData.opportunities.length;

  const handleResolve = async (strategy: MergeStrategy) => {
    setIsResolving(true);
    setSelectedStrategy(strategy);

    try {
      const result: MergeData = resolveMerge(strategy, localData, cloudData);

      setApplications(result.applications);
      setOpportunities(result.opportunities);

      clearConflict();
      markInitialLoadDone();
      resumeSync();

      if (onClose) onClose();
    } catch (err) {
      console.error('Failed to resolve merge conflict:', err);
    } finally {
      setIsResolving(false);
      setSelectedStrategy(null);
    }
  };

  const handleCancel = () => {
    // Keep sync paused, just close the modal
    if (onClose) onClose();
  };

  const strategies: { id: MergeStrategy; label: string; desc: string; icon: string }[] = [
    {
      id: 'useCloud',
      label: t('backupSync.merge.useCloud'),
      desc: t('backupSync.merge.useCloudDesc'),
      icon: '☁️',
    },
    {
      id: 'keepLocal',
      label: t('backupSync.merge.keepLocal'),
      desc: t('backupSync.merge.keepLocalDesc'),
      icon: '💻',
    },
    {
      id: 'merge',
      label: t('backupSync.merge.mergeBoth'),
      desc: t('backupSync.merge.mergeBothDesc'),
      icon: '🔀',
    },
  ];

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
      <div className='bg-white dark:bg-earth-800 border border-earth-200 dark:border-earth-700 rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden'>
        {/* Header */}
        <div className='bg-terracotta-50 dark:bg-terracotta-900/20 border-b border-terracotta-200 dark:border-terracotta-700 px-6 py-4'>
          <div className='flex items-center gap-3'>
            <span className='text-2xl'>⚠️</span>
            <div>
              <h2 className='font-serif text-xl font-bold text-terracotta-700 dark:text-terracotta-300'>
                {t('backupSync.merge.title')}
              </h2>
              <p className='text-sm text-terracotta-600 dark:text-terracotta-400 mt-1'>
                {t('backupSync.merge.description')}
              </p>
            </div>
          </div>
        </div>

        {/* Data summary */}
        <div className='px-6 py-4 border-b border-earth-200 dark:border-earth-700'>
          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div className='bg-earth-50 dark:bg-earth-700 rounded-lg p-3 text-center'>
              <p className='text-xs font-semibold text-earth-500 dark:text-earth-400 uppercase tracking-wider'>
                {t('backupSync.merge.localLabel')}
              </p>
              <p className='font-bold text-earth-900 dark:text-earth-100 mt-1'>
                {localAppCount} {localAppCount === 1 ? t('backupSync.loggedIn.applications_one') : t('backupSync.loggedIn.applications_other', { count: localAppCount })}
              </p>
              <p className='font-bold text-earth-900 dark:text-earth-100'>
                {localOppCount} {localOppCount === 1 ? t('backupSync.loggedIn.opportunities_one') : t('backupSync.loggedIn.opportunities_other', { count: localOppCount })}
              </p>
            </div>
            <div className='bg-sage-50 dark:bg-sage-900/20 rounded-lg p-3 text-center'>
              <p className='text-xs font-semibold text-sage-500 dark:text-sage-400 uppercase tracking-wider'>
                {t('backupSync.merge.cloudLabel')}
              </p>
              <p className='font-bold text-earth-900 dark:text-earth-100 mt-1'>
                {cloudAppCount} {cloudAppCount === 1 ? t('backupSync.loggedIn.applications_one') : t('backupSync.loggedIn.applications_other', { count: cloudAppCount })}
              </p>
              <p className='font-bold text-earth-900 dark:text-earth-100'>
                {cloudOppCount} {cloudOppCount === 1 ? t('backupSync.loggedIn.opportunities_one') : t('backupSync.loggedIn.opportunities_other', { count: cloudOppCount })}
              </p>
            </div>
          </div>
        </div>

        {/* Strategy options */}
        <div className='px-6 py-4 space-y-3'>
          {strategies.map((strategy) => (
            <button
              key={strategy.id}
              onClick={() => handleResolve(strategy.id)}
              disabled={isResolving}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                selectedStrategy === strategy.id
                  ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/20'
                  : 'border-earth-200 dark:border-earth-700 hover:border-sage-400 dark:hover:border-sage-600 hover:bg-earth-50 dark:hover:bg-earth-700'
              } ${isResolving ? 'opacity-50 cursor-not-allowed' : ''}`}
              type='button'
            >
              <div className='flex items-center gap-3'>
                <span className='text-xl'>{strategy.icon}</span>
                <div className='flex-1'>
                  <p className='font-semibold text-earth-900 dark:text-earth-100 text-sm'>
                    {strategy.label}
                  </p>
                  <p className='text-xs text-earth-600 dark:text-earth-400 mt-0.5'>
                    {strategy.desc}
                  </p>
                </div>
                {selectedStrategy === strategy.id && (
                  <span className='text-sage-600 dark:text-sage-400 text-sm'>
                    {isResolving ? '...' : '✓'}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className='px-6 py-4 border-t border-earth-200 dark:border-earth-700 flex justify-end'>
          <button
            onClick={handleCancel}
            disabled={isResolving}
            className='px-4 py-2 text-sm font-medium text-earth-600 dark:text-earth-400 hover:text-earth-800 dark:hover:text-earth-200 transition-colors'
            type='button'
          >
            {t('backupSync.merge.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

MergePromptModal.displayName = 'MergePromptModal';

export default MergePromptModal;
