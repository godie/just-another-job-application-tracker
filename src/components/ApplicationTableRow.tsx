// src/components/ApplicationTableRow.tsx
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TableColumn } from '../types/table';
import { sanitizeUrl } from '../utils/localStorage';
import { TableRow, TableCell, Button } from './ui';
import type { ApplicationWithMetadata } from '../hooks/useFilteredApplications';

interface ApplicationTableRowProps {
  item: ApplicationWithMetadata;
  columns: TableColumn[];
  onEdit: (application: ApplicationWithMetadata) => void;
  onDeleteRequest: (application: ApplicationWithMetadata) => void;
  getCellValue: (item: ApplicationWithMetadata, columnId: string) => string;
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

        // ⚡ Bolt: Use pre-calculated translated values from item metadata.
        // This avoids calling t() and running translation logic for status,
        // platform, and workType on every render of every row, which is a
        // significant saving for large lists.
        if (column.id === 'status') {
          cellContent = item.translatedStatus || cellContent;
        } else if (column.id === 'platform') {
          cellContent = item.translatedPlatform || cellContent;
        } else if (column.id === 'workType') {
          cellContent = item.translatedWorkType || cellContent;
        }

        const isNotes = column.id === 'notes';

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
        {/* ⚡ Bolt: Use CSS for hover visibility instead of JS state.
            This eliminates 2 row re-renders on every hover change across the table.
            We use opacity-0 group-hover:opacity-100 focus-within:opacity-100 to ensure
            it's also accessible via keyboard/screen reader focus. */}
        <Button
          variant="danger"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest(item);
          }}
          className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full transition-opacity duration-150"
          aria-label={t('home.deleteConfirm.titleFor', { position: item.position, company: item.company })}
          data-testid={`delete-btn-${item.id}`}
        >
          <span>{t('common.delete')}</span>
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default memo(ApplicationTableRow);
