import React from 'react';
import { useTranslation } from 'react-i18next';
import { type DateFormat } from '../../utils/localStorage';

interface DateFormatSettingsProps {
  currentFormat: DateFormat;
  onDateFormatChange: (format: DateFormat) => void;
}

const DateFormatSettings: React.FC<DateFormatSettingsProps> = ({ currentFormat, onDateFormatChange }) => {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('settings.sections.date')}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t('settings.sections.dateDesc', 'Choose how dates should be displayed throughout the application.')}
      </p>

      <div className="space-y-3">
        {(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as DateFormat[]).map((format) => {
          const exampleDate = new Date('2025-01-15');
          let example = '';
          const [day, month, year] = [
            String(exampleDate.getDate()).padStart(2, '0'),
            String(exampleDate.getMonth() + 1).padStart(2, '0'),
            exampleDate.getFullYear(),
          ];
          switch (format) {
            case 'DD/MM/YYYY':
              example = `${day}/${month}/${year}`;
              break;
            case 'MM/DD/YYYY':
              example = `${month}/${day}/${year}`;
              break;
            case 'YYYY-MM-DD':
              example = `${year}-${month}-${day}`;
              break;
          }

          return (
            <label
              key={format}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                currentFormat === format
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
              }`}
            >
              <input
                type="radio"
                name="dateFormat"
                value={format}
                checked={currentFormat === format}
                onChange={() => onDateFormatChange(format)}
                className="h-4 w-4 text-indigo-600"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-800 dark:text-white">{format}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('common.example')}: {example}</div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default DateFormatSettings;
