// src/components/ApplicationTableRow.tsx
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { type JobApplication, type ApplicationWithMetadata } from '../types/applications';
import { getCellValue } from '../utils/applications';
import type { TableColumn } from '../types/table';
import { sanitizeUrl } from '../utils/url';
import { TableRow, TableCell } from './ui/Table';
import { Badge } from './ui/Badge';
import { getBadgeVariantForStatus } from '../utils/status';

interface ApplicationTableRowProps {
  item: ApplicationWithMetadata;
  columns: TableColumn[];
  onEdit: (application: JobApplication) => void;
  onDeleteRequest: (application: JobApplication) => void;
}

const NOTES_TRUNCATE_LENGTH = 100;
const NOTES_WORD_WRAP_LENGTH = 50;

// This is a memoized component. It will only re-render if its props change.
// This prevents the entire table from re-rendering when, for example, a single
// row is hovered, which was causing performance issues with large lists.
const ApplicationTableRow: React.FC<ApplicationTableRowProps> = ({
  item,
  columns,
  onEdit,
  onDeleteRequest,
}) => {
  const { t } = useTranslation();


  return (
    <TableRow
      className="cursor-pointer group"
      data-testid={`row-${item.id}`}
    >
      {columns.map((column) => {
        const cellContent = getCellValue(item, column.id);
        const isNotes = column.id === 'notes';
        const isStatus = column.id === 'status';

        if (isStatus) {
          return (
            <TableCell
              key={column.id}
              onClick={() => onEdit(item)}
              className="px-4 sm:px-6 py-3 text-earth-900 dark:text-earth-100 border-r border-earth-100 dark:border-earth-700 group-hover:bg-sage-50 dark:group-hover:bg-sage-900/20 whitespace-nowrap"
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
              onClick={() => onEdit(item)}
              className={`px-4 sm:px-6 py-3 text-earth-900 dark:text-earth-100 border-r border-earth-100 dark:border-earth-700 group-hover:bg-sage-50 dark:group-hover:bg-sage-900/20 ${
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
            onClick={() => onEdit(item)}
            className="px-4 sm:px-6 py-3 whitespace-nowrap text-earth-900 dark:text-earth-100 border-r border-earth-100 dark:border-earth-700 group-hover:bg-sage-50 dark:group-hover:bg-sage-900/20"
          >
            {isLink ? (
              <a
                href={sanitizeUrl(cellContent)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sage-600 dark:text-sage-400 hover:underline"
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
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRequest(item);
            }}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors inline-flex items-center gap-1"
            aria-label={t('home.deleteConfirm.titleFor', { position: item.position, company: item.company })}
            data-testid={`delete-btn-${item.id}`}
          >
            <span>{t('common.delete')}</span>
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default memo(ApplicationTableRow);
