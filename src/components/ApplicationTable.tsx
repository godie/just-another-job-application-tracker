// src/components/ApplicationTable.tsx
import React, { useState, memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type JobApplication, type ApplicationWithMetadata } from '../types/applications';
import type { TableColumn } from '../types/table';
import ConfirmDialog from './ConfirmDialog';
import ApplicationTableRow from './ApplicationTableRow';
import ApplicationCard from './ApplicationCard';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/Table';
import { Card } from './ui/Card';

const ITEMS_PER_PAGE = 20;

interface ApplicationTableProps {
    columns: TableColumn[];
    data: ApplicationWithMetadata[];
    onSelectJob: (application: JobApplication) => void;
    onEdit: (application: JobApplication) => void;
    onDelete: (application: JobApplication) => void;
}

const PRIMARY_COLUMN_IDS = ['position', 'company', 'status'];

const ApplicationTable: React.FC<ApplicationTableProps> = ({ columns, data, onSelectJob, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; application: JobApplication | null }>({
    isOpen: false,
    application: null,
  });

  // Pagination logic
  const totalPages = Math.max(Math.ceil(data.length / ITEMS_PER_PAGE), 1);
  // Derive the effective page: clamp currentPage within valid range.
  // When data shrinks and currentPage exceeds totalPages, this returns 1.
  const effectivePage = useMemo(() => {
    return Math.min(currentPage, totalPages);
  }, [currentPage, totalPages]);

  const paginatedData = useMemo(() => {
    const startIndex = (effectivePage - 1) * ITEMS_PER_PAGE;
    return data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [data, effectivePage]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  return (
    <>
      {/* Mobile Card View */}
      <div className='md:hidden space-y-3' data-testid='application-cards'>
        {paginatedData.length === 0 ? (
          <div className='bg-earth-50 dark:bg-earth-800 p-8 border border-earth-200 dark:border-earth-700 text-center text-earth-600 dark:text-earth-400 italic text-sm font-medium'>
            {t('home.noApplications')}
          </div>
        ) : (
          paginatedData.map((item) => (
            <ApplicationCard
              key={item.id}
              item={item}
              otherColumns={otherColumns}
              onSelectJob={onSelectJob}
              onEdit={onEdit}
              onDeleteRequest={handleDeleteRequest}
            />
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <Card className='hidden md:block overflow-hidden border border-earth-200 dark:border-earth-700'>
        <Table data-testid='application-table'>
          <TableHeader>
            <TableRow className='hover:bg-transparent'>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className='px-4 sm:px-6 py-3 text-[11px] sm:text-xs font-semibold text-earth-700 dark:text-earth-300 uppercase tracking-wide bg-sage-50 dark:bg-sage-900/30 whitespace-nowrap'
                >
                  {column.label}
                </TableHead>
              ))}
              <TableHead className='relative px-4 sm:px-6 py-3 w-1 bg-sage-50 dark:bg-sage-900/30'>
                <span className='sr-only'>{t('common.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className='px-4 sm:px-6 py-10 text-center text-earth-600 dark:text-earth-400 italic text-sm font-medium' role='status' aria-live='polite'>
                  {t('home.noApplications')}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <ApplicationTableRow
                  key={item.id}
                  item={item}
                  columns={columns}
                  onSelectJob={onSelectJob}
                  onEdit={onEdit}
                  onDeleteRequest={handleDeleteRequest}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 pt-4'>
          <button
            type='button'
            onClick={() => goToPage(effectivePage - 1)}
            disabled={effectivePage === 1}
            className='px-4 py-2 text-sm font-medium text-earth-700 dark:text-earth-300 bg-white dark:bg-earth-800 border border-earth-300 dark:border-earth-600 rounded hover:bg-earth-50 dark:hover:bg-earth-700 disabled:opacity-50 disabled:cursor-not-allowed transition'
            aria-label={t('common.previous')}
          >
            {t('common.previous')}
          </button>

          <div className='flex items-center gap-1'>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                type='button'
                key={page}
                onClick={() => goToPage(page)}
                className={`px-3 py-1.5 text-sm font-medium rounded transition ${
                  effectivePage === page
                    ? 'bg-sage-600 text-white'
                    : 'text-earth-700 dark:text-earth-300 bg-white dark:bg-earth-800 border border-earth-300 dark:border-earth-600 hover:bg-earth-50 dark:hover:bg-earth-700'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            type='button'
            onClick={() => goToPage(effectivePage + 1)}
            disabled={effectivePage === totalPages}
            className='px-4 py-2 text-sm font-medium text-earth-700 dark:text-earth-300 bg-white dark:bg-earth-800 border border-earth-300 dark:border-earth-600 rounded hover:bg-earth-50 dark:hover:bg-earth-700 disabled:opacity-50 disabled:cursor-not-allowed transition'
            aria-label={t('common.next')}
          >
            {t('common.next')}
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={t('home.deleteConfirm.title')}
        message={t('home.deleteConfirm.message', {
          position: deleteConfirm.application?.position,
          company: deleteConfirm.application?.company
        })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type='warning'
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