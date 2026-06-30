import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/Card';
import type { SettingsSection } from './SettingsSidebar';

interface SectionInfo {
  id: SettingsSection;
  label: string;
  icon: string;
  description: string;
}

interface SettingsSectionHeaderProps {
  section: SectionInfo;
  hasChanges: boolean;
  onSave: () => void;
  onReset: () => void;
}

const UnsavedChangesBanner: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-destructive/5 dark:bg-destructive/10 border border-destructive/30 w-fit">
      <div className="size-2 rounded-full bg-destructive/80" />
      <span className="text-xs text-destructive font-semibold uppercase tracking-wider">
        {t('settings.unsavedChanges')}
      </span>
    </div>
  );
};

export const SettingsSectionHeader: React.FC<SettingsSectionHeaderProps> = ({
  section,
  hasChanges,
  onSave,
  onReset,
}) => {
  const { t } = useTranslation();

  return (
    <Card className={`mb-8 overflow-hidden ${section.id === 'atsSearch' ? 'border-l-2 border-l-primary' : ''}`}>
      <div className="p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-4">
          <div className="flex items-center gap-4">
            <div className="size-14 bg-muted rounded flex items-center justify-center text-3xl">
              {section.icon}
            </div>
            <div>
              <h2 className="font-serif text-2xl font-semibold text-foreground">
                {section.label}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {section.description}
              </p>
            </div>
          </div>

          {/* Save/Reset Controls for desktop */}
          <div className="hidden sm:flex items-center gap-4">
            <button
              type="button"
              onClick={onReset}
              className="px-5 py-2.5 text-sm font-semibold text-muted-foreground bg-card border border-border hover:bg-muted transition-colors"
            >
              {t('settings.resetDefault')}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!hasChanges}
              className={`inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-semibold transition-colors ${
                hasChanges
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              {t('settings.saveChanges')}
            </button>
          </div>
        </div>
        {hasChanges && <UnsavedChangesBanner />}
      </div>
    </Card>
  );
};
