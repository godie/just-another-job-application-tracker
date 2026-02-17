// src/components/ApplicationTableRow.tsx
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobApplication } from '../types/applications';
import type { ApplicationWithMetadata } from '../hooks/useFilteredApplications';
import type { TableColumn } from '../types/table';
import { sanitizeUrl } from '../utils/localStorage';
import { TableRow, TableCell, Button, Badge } from './ui';
import { getBadgeVariantForStatus } from '../utils/status';

interface ApplicationTableRowProps {
  item: ApplicationWithMetadata;
  columns: TableColumn[];
  onEdit: (application: JobApplication) => void;
  onDeleteRequest: (application: JobApplication) => void;
  getCellValue: (item: JobApplication, columnId: string) => string;
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
  getCellValue,
}) => {
  const { t } = useTranslation();


  return (
    <TableRow
      className="cursor-pointer group"
      data-testid={`row-${item.id}`}
    >
      {columns.map((column) => {
        let cellContent = getCellValue(item, column.id);

        // ⚡ Bolt: Use pre-calculated translations for better performance
        if (column.id === 'status' && item.translatedStatus) {
          cellContent = item.translatedStatus;
        } else if (column.id === 'platform' && item.translatedPlatform) {
          cellContent = item.translatedPlatform;
        } else if (column.id === 'workType' && item.translatedWorkType) {
          cellContent = item.translatedWorkType;
        }

        const isNotes = column.id === 'notes';
        const isStatus = column.id === 'status';

        if (isStatus) {
          return (
            <TableCell
              key={column.id}
              onClick={() => onEdit(item)}
              className="px-4 sm:px-6 py-3 text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900 whitespace-nowrap"
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
              className={`px-4 sm:px-6 py-3 text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900 ${
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
            className="px-4 sm:px-6 py-3 whitespace-nowrap text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900"
          >
            {isLink ? (
              <a
                href={sanitizeUrl(cellContent)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
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
            variant="danger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRequest(item);
            }}
            className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full transition"
            aria-label={t('home.deleteConfirm.titleFor', { position: item.position, company: item.company })}
            data-testid={`delete-btn-${item.id}`}
          >
            <span>{t('common.delete')}</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default memo(ApplicationTableRow);
