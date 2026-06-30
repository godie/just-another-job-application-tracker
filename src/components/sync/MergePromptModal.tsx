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
      <div className='bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden'>
        {/* Header */}
        <div className='bg-destructive/5 dark:bg-destructive/10 border-b border-destructive/30 px-6 py-4'>
          <div className='flex items-center gap-3'>
            <span className='text-2xl'>⚠️</span>
            <div>
              <h2 className='font-serif text-xl font-semibold text-destructive'>
                {t('backupSync.merge.title')}
              </h2>
              <p className='text-sm text-destructive mt-1'>
                {t('backupSync.merge.description')}
              </p>
            </div>
          </div>
        </div>

        {/* Data summary */}
        <div className='px-6 py-4 border-b border-border'>
          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div className='bg-muted rounded-lg p-3 text-center'>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                {t('backupSync.merge.localLabel')}
              </p>
              <p className='font-bold text-foreground mt-1'>
                {localAppCount} {localAppCount === 1 ? t('backupSync.loggedIn.applications_one') : t('backupSync.loggedIn.applications_other', { count: localAppCount })}
              </p>
              <p className='font-bold text-foreground'>
                {localOppCount} {localOppCount === 1 ? t('backupSync.loggedIn.opportunities_one') : t('backupSync.loggedIn.opportunities_other', { count: localOppCount })}
              </p>
            </div>
            <div className='bg-primary/5 dark:bg-primary/10 rounded-lg p-3 text-center'>
              <p className='text-xs font-semibold text-primary uppercase tracking-wider'>
                {t('backupSync.merge.cloudLabel')}
              </p>
              <p className='font-bold text-foreground mt-1'>
                {cloudAppCount} {cloudAppCount === 1 ? t('backupSync.loggedIn.applications_one') : t('backupSync.loggedIn.applications_other', { count: cloudAppCount })}
              </p>
              <p className='font-bold text-foreground'>
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
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-muted'
              } ${isResolving ? 'opacity-50 cursor-not-allowed' : ''}`}
              type='button'
            >
              <div className='flex items-center gap-3'>
                <span className='text-xl'>{strategy.icon}</span>
                <div className='flex-1'>
                  <p className='font-semibold text-foreground text-sm'>
                    {strategy.label}
                  </p>
                  <p className='text-xs text-muted-foreground mt-0.5'>
                    {strategy.desc}
                  </p>
                </div>
                {selectedStrategy === strategy.id && (
                  <span className='text-primary text-sm'>
                    {isResolving ? '...' : '✓'}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className='px-6 py-4 border-t border-border flex justify-end'>
          <button
            onClick={handleCancel}
            disabled={isResolving}
            className='px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
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
