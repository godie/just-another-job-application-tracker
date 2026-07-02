import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { getBadgeVariantForStatus } from '../utils/status';
import { type JobApplication } from '../types/applications';

interface JobHeaderCardProps {
  application: JobApplication;
  isEditing: boolean;
  onDoubleClick?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
}

export const JobHeaderCard: React.FC<JobHeaderCardProps> = ({
  application,
  isEditing,
  onDoubleClick,
  onEdit,
  onDelete,
  onCancelEdit,
  onSaveEdit,
}) => {
  const { t } = useTranslation();
  return (
    <Card className="mb-6 overflow-hidden">
      <div
        className="p-6"
        onDoubleClick={onDoubleClick}
        data-testid="details-header-card"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 font-mono">
              <span className="bg-muted px-2 py-0.5 rounded">{application.id}</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-foreground truncate">
              {application.position}
            </h1>
            <p className="text-lg text-muted-foreground mt-1">{application.company}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Badge variant={getBadgeVariantForStatus(application.status)}>
              {application.status}
            </Badge>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancelEdit}
                data-testid="details-cancel"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onSaveEdit}
                data-testid="details-save"
              >
                {t('common.save', 'Save')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onEdit}>
                {t('common.edit', 'Edit')}
              </Button>
              <Button variant="danger" size="sm" onClick={onDelete}>
                {t('common.delete', 'Delete')}
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
