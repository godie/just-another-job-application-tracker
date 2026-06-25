import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ProposedAddition, ProposedUpdate } from '../mails/types';
import type { JobApplication } from '../types/applications';
import { isApplicationDuplicate } from '../utils/applications';
import { ProposedAdditionItem } from './ProposedAdditionItem';
import { ProposedUpdateItem } from './ProposedUpdateItem';

interface ScanResultsProps {
  preview: {
    proposedAdditions: ProposedAddition[];
    proposedUpdates: ProposedUpdate[];
    emails: unknown[];
  };
  applications: JobApplication[];
  selectedAdditions: {
    isSelected: (id: string) => boolean;
    toggle: (id: string) => void;
    selectAll: (ids: string[]) => void;
  };
  selectedUpdates: {
    isSelected: (id: string) => boolean;
    toggle: (id: string) => void;
    selectAll: (ids: string[]) => void;
  };
  forceAddIds: {
    isSelected: (id: string) => boolean;
    select: (id: string) => void;
    deselect: (id: string) => void;
  };
  formatDate: (date: string) => string;
}

export const ScanResults: React.FC<ScanResultsProps> = ({
  preview,
  applications,
  selectedAdditions,
  selectedUpdates,
  forceAddIds,
  formatDate,
}) => {
  const { t } = useTranslation();

  const selectAllAdditions = () => {
    selectedAdditions.selectAll(preview.proposedAdditions.map((a) => a.id));
  };

  const selectAllUpdates = () => {
    selectedUpdates.selectAll(preview.proposedUpdates.map((u) => u.id));
  };

  if (preview.proposedAdditions.length === 0 && preview.proposedUpdates.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded border-2 border-dashed border-border">
        <p className="text-muted-foreground">
          {t('settings.emailScan.nothingFound')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-8">
      {preview.proposedAdditions.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs dark:bg-primary/10 dark:text-primary">
                {preview.proposedAdditions.length}
              </span>
              {t('settings.emailScan.newApplications', {
                count: preview.proposedAdditions.length,
              })}
            </h3>
            <button
              type="button"
              onClick={selectAllAdditions}
              className="text-sm text-primary hover:underline"
            >
              {t('settings.emailScan.selectAll')}
            </button>
          </div>
          <ul className="grid gap-3">
            {preview.proposedAdditions.map((addition: ProposedAddition) => (
              <ProposedAdditionItem
                key={addition.id}
                addition={addition}
                isSelected={selectedAdditions.isSelected(addition.id)}
                onToggle={() => selectedAdditions.toggle(addition.id)}
                duplicate={isApplicationDuplicate(applications, addition.data.company, addition.data.position)}
                isForced={forceAddIds.isSelected(addition.id)}
                onToggleForce={(forced) => {
                  if (forced) forceAddIds.select(addition.id);
                  else forceAddIds.deselect(addition.id);
                }}
                formatDate={formatDate}
              />
            ))}
          </ul>
        </section>
      )}

      {preview.proposedUpdates.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs dark:bg-green-900/40 dark:text-green-300">
                {preview.proposedUpdates.length}
              </span>
              {t('settings.emailScan.updatesToExisting', {
                count: preview.proposedUpdates.length,
              })}
            </h3>
            <button
              type="button"
              onClick={selectAllUpdates}
              className="text-sm text-primary hover:underline"
            >
              {t('settings.emailScan.selectAll')}
            </button>
          </div>
          <ul className="grid gap-3">
            {preview.proposedUpdates.map((update: ProposedUpdate) => (
              <ProposedUpdateItem
                key={update.id}
                update={update}
                isSelected={selectedUpdates.isSelected(update.id)}
                onToggle={() => selectedUpdates.toggle(update.id)}
                formatDate={formatDate}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default ScanResults;
