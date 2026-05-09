import React from 'react';
import { useTranslation } from 'react-i18next';
import { type DateFormat } from '../../types/preferences';

interface DateFormatSettingsProps {
  currentFormat: DateFormat;
  onDateFormatChange: (format: DateFormat) => void;
}

const DateFormatSettings: React.FC<DateFormatSettingsProps> = ({ currentFormat, onDateFormatChange }) => {
  const { t } = useTranslation();

  const formats: DateFormat[] = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 gap-4'>
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
              className={`flex items-center justify-between p-5 rounded border-2 transition-all text-left ${
                isActive
                  ? 'border-sage-600 bg-sage-50/50 dark:bg-sage-900/20'
                  : 'border-earth-200 dark:border-earth-700 hover:border-earth-300 dark:hover:border-earth-600 bg-white dark:bg-earth-800'
              }`}
            >
              <div className='flex items-center gap-4'>
                <div className={`size-5 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-sage-600' : 'border-earth-300 dark:border-earth-600'}`}>
                  {isActive && <div className='size-2.5 rounded-full bg-sage-600' />}
                </div>
                <div>
                  <div className='font-bold text-earth-900 dark:text-earth-100'>{format}</div>
                  <div className='text-sm text-earth-500 dark:text-earth-400 mt-1'>
                    {t('common.example')}: <span className='font-mono text-sage-600 dark:text-sage-400'>{example}</span>
                  </div>
                </div>
              </div>
              {isActive && (
                <span className='text-sage-600'>
                  <svg xmlns='http://www.w3.org/2000/svg' className='size-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
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