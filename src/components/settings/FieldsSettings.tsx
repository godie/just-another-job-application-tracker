import React from 'react';
import { useTranslation } from 'react-i18next';
import { type FieldDefinition } from '../../types/preferences';

interface FieldsSettingsProps {
  orderedFields: FieldDefinition[];
  enabledFields: string[];
  defaultFields: FieldDefinition[];
  onToggleField: (fieldId: string) => void;
  onMoveField: (dragIndex: number, hoverIndex: number) => void;
}

const FieldsSettings: React.FC<FieldsSettingsProps> = ({
  orderedFields,
  enabledFields,
  defaultFields,
  onToggleField,
  onMoveField,
}) => {
  const { t } = useTranslation();

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const hoverIndex = direction === 'up' ? index - 1 : index + 1;
    onMoveField(index, hoverIndex);
  };

  return (
    <div className="space-y-6">
      <div className="border border-earth-200 dark:border-earth-700 rounded overflow-hidden divide-y divide-earth-200 dark:divide-earth-700">
        {orderedFields.map((field, index) => {
          const isEnabled = enabledFields.includes(field.id);
          const isCustom = !defaultFields.find((f) => f.id === field.id);
          return (
            <div
              key={field.id}
              className="flex items-center justify-between px-4 py-4 bg-white dark:bg-earth-800 hover:bg-earth-50 dark:hover:bg-earth-700/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="relative flex items-center">
                  <input
                    id={`field-${field.id}`}
                    name={`field-${field.id}`}
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => onToggleField(field.id)}
                    className='h-5 w-5 text-sage-600 border-earth-300 dark:border-earth-600 rounded focus:ring-sage-500 transition cursor-pointer'
                  />
                </div>
                <div>
                  <label
                    htmlFor={`field-${field.id}`}
                    className='text-sm font-bold text-earth-900 dark:text-earth-100 cursor-pointer'
                  >
                    {!isCustom ? t(`fields.${field.id}`, field.label) : field.label}
                    {isCustom && (
                      <span className='ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sage-100 text-sage-800 dark:bg-sage-900/40 dark:text-sage-300'>
                        {t('settings.custom.title')}
                      </span>
                    )}
                  </label>
                  <p className="text-xs text-earth-500 dark:text-earth-400 mt-0.5">
                    {field.required ? t('settings.fields.required') : t('settings.fields.optional')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMove(index, 'up')}
                  disabled={index === 0}
                  className={`p-2 rounded transition ${
                    index === 0
                      ? 'text-earth-300 dark:text-earth-600 cursor-not-allowed'
                      : 'text-earth-500 dark:text-earth-400 hover:bg-earth-100 dark:hover:bg-earth-700 hover:text-earth-700 dark:hover:text-earth-200'
                  }`}
                  title="Move Up"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 'down')}
                  disabled={index === orderedFields.length - 1}
                  className={`p-2 rounded transition ${
                    index === orderedFields.length - 1
                      ? 'text-earth-300 dark:text-earth-600 cursor-not-allowed'
                      : 'text-earth-500 dark:text-earth-400 hover:bg-earth-100 dark:hover:bg-earth-700 hover:text-earth-700 dark:hover:text-earth-200'
                  }`}
                  title="Move Down"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FieldsSettings;
