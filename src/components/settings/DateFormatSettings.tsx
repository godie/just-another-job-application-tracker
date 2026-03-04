import React from 'react';
import { useTranslation } from 'react-i18next';
import { type DateFormat } from '../../utils/localStorage';

interface DateFormatSettingsProps {
  currentFormat: DateFormat;
  onDateFormatChange: (format: DateFormat) => void;
}

const DateFormatSettings: React.FC<DateFormatSettingsProps> = ({ currentFormat, onDateFormatChange }) => {
  const { t } = useTranslation();

  const formats: DateFormat[] = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {formats.map((format) => {
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

          const isActive = currentFormat === format;

          return (
            <button
              key={format}
              onClick={() => onDateFormatChange(format)}
              className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all text-left ${
                isActive
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                  : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}>
                  {isActive && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">{format}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('common.example')}: <span className="font-mono text-indigo-600 dark:text-indigo-400">{example}</span>
                  </div>
                </div>
              </div>
              {isActive && (
                <span className="text-indigo-600">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DateFormatSettings;
