import React from 'react';
import { useTranslation } from 'react-i18next';

interface EmailScanControlsProps {
  scanMonths: number;
  loading: boolean;
  applying: boolean;
  hasPreview: boolean;
  selectedCount: number;
  onScanMonthsChange: (months: number) => void;
  onScan: () => void;
  onClearPreview: () => void;
  onApply: () => void;
}

const EmailScanControls: React.FC<EmailScanControlsProps> = ({
  scanMonths,
  loading,
  applying,
  hasPreview,
  selectedCount,
  onScanMonthsChange,
  onScan,
  onClearPreview,
  onApply,
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t('settings.emailScan.scanPeriod')}
        </label>
        <select
          value={scanMonths}
          onChange={(e) => onScanMonthsChange(parseInt(e.target.value))}
          disabled={loading}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 transition-all"
        >
          <option value={3}>{t('settings.emailScan.months', { count: 3 })}</option>
          <option value={6}>{t('settings.emailScan.months', { count: 6 })}</option>
          <option value={9}>{t('settings.emailScan.months', { count: 9 })}</option>
          <option value={12}>{t('settings.emailScan.months', { count: 12 })}</option>
        </select>
      </div>

      <button
        type="button"
        onClick={onScan}
        disabled={loading}
        className="px-4 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition h-[38px] flex items-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t('settings.emailScan.scanning')}
          </>
        ) : (
          t('settings.emailScan.scanGmail')
        )}
      </button>
      {hasPreview && (
        <>
          <button
            type="button"
            onClick={onClearPreview}
            className="px-4 py-2 rounded-lg font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            {t('settings.emailScan.clearPreview')}
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={applying || selectedCount === 0}
            className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {applying
              ? t('settings.emailScan.applying')
              : t('settings.emailScan.applySelected', {
                  count: selectedCount,
                })}
          </button>
        </>
      )}
    </div>
  );
};

export default EmailScanControls;
