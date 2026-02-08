// src/components/ApplicationTable.tsx
import React, { useState, memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobApplication } from '../types/applications';
import type { TableColumn } from '../types/table';
import ConfirmDialog from './ConfirmDialog';
import ApplicationTableRow from './ApplicationTableRow';
import ApplicationCard from './ApplicationCard';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, Card } from './ui';

interface ApplicationTableProps {
    columns: TableColumn[];
    data: JobApplication[];
    onEdit: (application: JobApplication) => void;
    onDelete: (application: JobApplication) => void;
}


// Map column names to JobApplication properties
const columnToKeyMap: Record<string, keyof JobApplication> = {
  'position': 'position',
  'company': 'company',
  'salary': 'salary',
  'status': 'status',
  'applicationdate': 'applicationDate',
  'interviewdate': 'interviewDate',
  'platform': 'platform',
  'contactname': 'contactName',
  'followupdate': 'followUpDate',
  'notes': 'notes',
  'link': 'link',
};

const PRIMARY_COLUMN_IDS = ['position', 'company', 'status'];

// ⚡ Bolt: Moved static helpers outside the component.
// These functions do not depend on component state or props, so defining them
// outside prevents them from being recreated on every render. This reduces
// garbage collection pressure and improves rendering performance.
const getCellValue = (item: JobApplication, columnId: string): string => {
  const directValue = item[columnId as keyof JobApplication];
  if (typeof directValue === 'string' || typeof directValue === 'number') {
    return directValue ? String(directValue) : '';
  }

  if (item.customFields && columnId in item.customFields) {
    return item.customFields[columnId] ?? '';
  }

  const normalizedColumn = columnId.toLowerCase().replace(/ /g, '').replace(/-/g, '');
  const key = columnToKeyMap[normalizedColumn];
  return key ? String(item[key] ?? '') : '';
};

const ApplicationTable: React.FC<ApplicationTableProps> = ({ columns, data, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; application: JobApplication | null }>({
    isOpen: false,
    application: null,
  });

  // ⚡ Bolt: Memoize column calculations.
  // By wrapping these calculations in useMemo, we ensure they are only
  // re-computed when the `columns` prop changes. This prevents unnecessary
  // array filtering on every render, which is a small but meaningful
  // optimization, especially if the component re-renders frequently.
  const otherColumns = useMemo(() => {
    const excluded = new Set(PRIMARY_COLUMN_IDS);
    return columns.filter(col => !excluded.has(col.id));
  }, [columns]);

  const handleDeleteRequest = useCallback((application: JobApplication) => {
    setDeleteConfirm({ isOpen: true, application });
  }, []);

  const handleMouseEnter = useCallback((id: string) => {
    setHoveredRowId(id);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredRowId(null);
  }, []);

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3" data-testid="application-cards">
        {data.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 text-center text-gray-400 dark:text-gray-500 italic text-sm">
            {t('home.noApplications')}
          </div>
        ) : (
          data.map((item) => (
            <ApplicationCard
              key={item.id}
              item={item}
              otherColumns={otherColumns}
              onEdit={onEdit}
              onDeleteRequest={handleDeleteRequest}
              getCellValue={getCellValue}
            />
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block overflow-hidden shadow-xl">
        <Table data-testid="application-table">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className="px-4 sm:px-6 py-3 text-[11px] sm:text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/50 whitespace-nowrap"
                >
                  {column.label}
                </TableHead>
              ))}
              <TableHead className="relative px-4 sm:px-6 py-3 w-1 bg-indigo-50 dark:bg-indigo-900/50">
                <span className="sr-only">{t('common.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="px-4 sm:px-6 py-10 text-center text-gray-400 dark:text-gray-500 italic text-sm">
                  {t('home.noApplications')}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <ApplicationTableRow
                  key={item.id}
                  item={item}
                  columns={columns}
                  isHovered={hoveredRowId === item.id}
                  onEdit={onEdit}
                  onDeleteRequest={handleDeleteRequest}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  getCellValue={getCellValue}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={t('home.deleteConfirm.title')}
        message={t('home.deleteConfirm.message', {
          position: deleteConfirm.application?.position,
          company: deleteConfirm.application?.company
        })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type="warning"
        onConfirm={() => {
          if (deleteConfirm.application) {
            onDelete(deleteConfirm.application);
          }
          setDeleteConfirm({ isOpen: false, application: null });
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, application: null })}
      />
   </>
  );
};

export default memo(ApplicationTable);
