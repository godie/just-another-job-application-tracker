import React from 'react';
import { useTranslation } from 'react-i18next';
import { type DateFormat } from '../../types/preferences';

interface DateFormatSettingsProps {
  currentFormat: DateFormat;
  onDateFormatChange: (format: DateFormat) => void;
}

const DATE_FORMATS: DateFormat[] = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

const DATE_FORMAT_EXAMPLES: Record<DateFormat, string> = {
  'DD/MM/YYYY': '15/01/2025',
  'MM/DD/YYYY': '01/15/2025',
  'YYYY-MM-DD': '2025-01-15',
};

const DateFormatSettings: React.FC<DateFormatSettingsProps> = ({ currentFormat, onDateFormatChange }) => {
  const { t } = useTranslation();

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 gap-4'>
        {DATE_FORMATS.map((format) => {
          const example = DATE_FORMAT_EXAMPLES[format];
          const isActive = currentFormat === format;

          return (
            <button
              type='button'
              key={format}
              onClick={() => onDateFormatChange(format)}
              className={`flex items-center justify-between p-5 rounded border-2 transition-all text-left ${
                isActive
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-border hover:border-border bg-card'
              }`}
            >
              <div className='flex items-center gap-4'>
                <div className={`size-5 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-primary' : 'border-border'}`}>
                  {isActive && <div className='size-2.5 rounded-full bg-primary' />}
                </div>
                <div>
                  <div className='font-bold text-foreground'>{format}</div>
                  <div className='text-sm text-muted-foreground mt-1'>
                    {t('common.example')}: <span className='font-mono text-primary'>{example}</span>
                  </div>
                </div>
              </div>
              {isActive && (
                <span className='text-primary'>
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
