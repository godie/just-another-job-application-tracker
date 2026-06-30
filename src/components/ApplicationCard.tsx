import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { type JobApplication, type ApplicationWithMetadata } from '../types/applications';
import { getCellValue } from '../utils/applications';
import type { TableColumn } from '../types/table';
import { sanitizeUrl } from '../utils/url';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Separator } from './ui/Separator';
import { getBadgeVariantForStatus } from '../utils/status';

interface ApplicationCardProps {
  item: ApplicationWithMetadata;
  otherColumns: TableColumn[];
  onSelectJob: (application: JobApplication) => void;
  onEdit: (application: JobApplication) => void;
  onDeleteRequest: (application: JobApplication) => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({
  item,
  otherColumns,
  onSelectJob,
  onDeleteRequest,
}) => {
  const { t } = useTranslation();

  const positionValue = getCellValue(item, 'position') || 'No Position';
  const companyValue = getCellValue(item, 'company') || 'No Company';
  const statusValue = getCellValue(item, 'status') || 'N/A';


  return (
    <Card
      onClick={() => onSelectJob(item)}
      className='p-4 cursor-pointer border border-border bg-card hover:border-primary transition-colors'
      data-testid={`card-${item.id}`}
    >
      {/* Primary Info */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground truncate" title={positionValue}>
            {positionValue}
          </h3>
          <h4 className="text-sm text-muted-foreground truncate mt-0.5" title={companyValue}>
            {companyValue}
          </h4>
        </div>
        <div className="ml-3 flex-shrink-0">
          <Badge variant={getBadgeVariantForStatus(item.status)}>
            {statusValue}
          </Badge>
        </div>
      </div>

      {/* Other Important Info */}
      <div className="space-y-2 text-xs text-muted-foreground">
        {otherColumns.slice(0, 3).map((column) => {
          const value = getCellValue(item, column.id);
          if (!value) return null;
          const isLink = column.id === 'link';

          return (
            <div key={column.id} className="flex items-center min-w-0">
              <span className="font-medium text-muted-foreground w-24 flex-shrink-0 truncate">
                {column.label}:
              </span>
              {isLink ? (
                <a
                  href={sanitizeUrl(value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0 truncate text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                  title={value}
                >
                  {value}
                </a>
              ) : (
                <span className="flex-1 min-w-0 truncate" title={value}>
                  {value}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <Separator className="my-3" />
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest(item);
          }}
          className="text-destructive hover:text-destructive/80 px-3 py-1 rounded transition"
          aria-label={t('home.deleteConfirm.titleFor', { position: item.position, company: item.company })}
          data-testid={`delete-btn-${item.id}`}
        >
          {t('common.delete')}
        </Button>
      </div>
    </Card>
  );
};

export default memo(ApplicationCard);
