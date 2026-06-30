import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { type JobApplication, type ApplicationWithMetadata } from '../types/applications';
import { getCellValue } from '../utils/applications';
import type { TableColumn } from '../types/table';
import { sanitizeUrl } from '../utils/url';
import { TableRow, TableCell } from './ui/Table';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { getBadgeVariantForStatus } from '../utils/status';

interface ApplicationTableRowProps {
  item: ApplicationWithMetadata;
  columns: TableColumn[];
  onSelectJob: (application: JobApplication) => void;
  onEdit: (application: JobApplication) => void;
  onDeleteRequest: (application: JobApplication) => void;
}

const NOTES_TRUNCATE_LENGTH = 100;
const NOTES_WORD_WRAP_LENGTH = 50;

const ApplicationTableRow: React.FC<ApplicationTableRowProps> = ({
  item,
  columns,
  onSelectJob,
  onDeleteRequest,
}) => {
  const { t } = useTranslation();


  return (
    <TableRow
      className="cursor-pointer group"
      data-testid={`row-${item.id}`}
      onClick={() => onSelectJob(item)}
    >
      {columns.map((column) => {
        const cellContent = getCellValue(item, column.id);
        const isNotes = column.id === 'notes';
        const isStatus = column.id === 'status';

        if (isStatus) {
          return (
            <TableCell
              key={column.id}
              className="px-4 sm:px-6 py-3 text-foreground border-r border-border group-hover:bg-muted whitespace-nowrap"
            >
              <Badge variant={getBadgeVariantForStatus(item.status)}>
                {cellContent}
              </Badge>
            </TableCell>
          );
        }

        if (isNotes) {
          const originalLength = cellContent.length;
          const hasLineBreaks = /[\r\n]/.test(cellContent);
          let truncatedContent = cellContent;

          if (originalLength > NOTES_TRUNCATE_LENGTH) {
            truncatedContent = cellContent.substring(0, NOTES_TRUNCATE_LENGTH) + '...';
          }

          const shouldWrap = hasLineBreaks || originalLength > NOTES_WORD_WRAP_LENGTH;

          return (
            <TableCell
              key={column.id}
              className={`px-4 sm:px-6 py-3 text-foreground border-r border-border group-hover:bg-muted ${
                shouldWrap ? 'whitespace-pre-line' : 'whitespace-nowrap'
              } ${isNotes ? 'max-w-xs' : ''}`}
            >
              <span
                className={`block ${shouldWrap ? 'break-words' : 'truncate'} ${isNotes ? '' : 'max-w-[180px] sm:max-w-none'}`}
              >
                {truncatedContent}
              </span>
            </TableCell>
          );
        }

        const isLink = column.id === 'link';
        return (
          <TableCell
            key={column.id}
            className="px-4 sm:px-6 py-3 whitespace-nowrap text-foreground border-r border-border group-hover:bg-muted"
          >
            {isLink ? (
              <a
                href={sanitizeUrl(cellContent)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {cellContent}
              </a>
            ) : (
              <span className="block truncate max-w-[180px] sm:max-w-none">
                {cellContent}
              </span>
            )}
          </TableCell>
        );
      })}

      <TableCell className="px-4 sm:px-6 py-3 whitespace-nowrap text-right text-sm font-medium w-1">
        {/* ⚡ Bolt: CSS-based hover effect for the delete button.
            Using Tailwind's group-hover classes avoids triggering React re-renders
            for the entire table during mouse movements, significantly improving
            performance for large lists. */}
        <div className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200">
          <Button
            variant='danger'
            size='sm'
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRequest(item);
            }}
            aria-label={t('home.deleteConfirm.titleFor', { position: item.position, company: item.company })}
            data-testid={`delete-btn-${item.id}`}
          >
            {t('common.delete')}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default memo(ApplicationTableRow);
