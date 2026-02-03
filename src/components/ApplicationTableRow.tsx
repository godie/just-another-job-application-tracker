// src/components/ApplicationTableRow.tsx
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobApplication } from '../types/applications';
import type { TableColumn } from '../types/table';
import { sanitizeUrl } from '../utils/localStorage';
import DOMPurify from 'dompurify';
import { TableRow, TableCell, Button } from './ui';

interface ApplicationTableRowProps {
  item: JobApplication;
  columns: TableColumn[];
  isHovered: boolean;
  onEdit: (application: JobApplication) => void;
  onDeleteRequest: (application: JobApplication) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
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
  isHovered,
  onEdit,
  onDeleteRequest,
  onMouseEnter,
  onMouseLeave,
  getCellValue,
}) => {
  const { t } = useTranslation();
  const createMarkup = (htmlContent: string) => {
    return { __html: DOMPurify.sanitize(htmlContent) };
  };

  return (
    <TableRow
      className="cursor-pointer group"
      onMouseEnter={() => onMouseEnter(item.id)}
      onMouseLeave={onMouseLeave}
      data-testid={`row-${item.id}`}
    >
      {columns.map((column) => {
        let cellContent = getCellValue(item, column.id);

        if (column.id === 'status' && cellContent) {
          cellContent = t(`statuses.${cellContent.toLowerCase()}`, cellContent);
        } else if (column.id === 'platform' && cellContent) {
          cellContent = t(`form.platforms.${cellContent}`, cellContent);
        }

        const isNotes = column.id === 'notes';

        if (isNotes) {
          const originalLength = cellContent.length;
          const hasLineBreaks = /[\r\n]/.test(cellContent);
          let truncatedContent = cellContent;

          if (originalLength > NOTES_TRUNCATE_LENGTH) {
            truncatedContent = cellContent.substring(0, NOTES_TRUNCATE_LENGTH) + '...';
          }

          const finalContent = hasLineBreaks
            ? truncatedContent.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>').replace(/\r/g, '<br>')
            : truncatedContent;

          const shouldWrap = hasLineBreaks || originalLength > NOTES_WORD_WRAP_LENGTH;

          return (
            <TableCell
              key={column.id}
              onClick={() => onEdit(item)}
              className={`px-4 sm:px-6 py-3 text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900 ${
                shouldWrap ? 'whitespace-normal' : 'whitespace-nowrap'
              } ${isNotes ? 'max-w-xs' : ''}`}
            >
              <span
                className={`block ${shouldWrap ? 'break-words' : 'truncate'} ${isNotes ? '' : 'max-w-[180px] sm:max-w-none'}`}
                dangerouslySetInnerHTML={createMarkup(finalContent)}
              />
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
                dangerouslySetInnerHTML={createMarkup(cellContent)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="block truncate max-w-[180px] sm:max-w-none"
                dangerouslySetInnerHTML={createMarkup(cellContent)}
              />
            )}
          </TableCell>
        );
      })}

      <TableCell className="px-4 sm:px-6 py-3 whitespace-nowrap text-right text-sm font-medium w-1">
        {isHovered && (
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
        )}
      </TableCell>
    </TableRow>
  );
};

export default memo(ApplicationTableRow);
