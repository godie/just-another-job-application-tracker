import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';

interface JobDetailFooterProps {
  isEditing: boolean;
  onBack: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
}

export const JobDetailFooter: React.FC<JobDetailFooterProps> = ({
  isEditing,
  onBack,
  onEdit,
  onCancelEdit,
  onSaveEdit,
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between mb-8">
      <Button variant="ghost" onClick={onBack}>
        ← {t('jobDetails.backToApplications', 'Back to Applications')}
      </Button>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={onCancelEdit}
            data-testid="details-cancel-footer"
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onSaveEdit}
            data-testid="details-save-footer"
          >
            {t('common.save', 'Save')}
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={onEdit}>
          {t('common.edit', 'Edit')}
        </Button>
      )}
    </div>
  );
};
