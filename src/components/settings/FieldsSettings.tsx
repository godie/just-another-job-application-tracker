import React from 'react';
import { useTranslation } from 'react-i18next';
import { type FieldDefinition } from '../../utils/localStorage';

interface FieldsSettingsProps {
  orderedFields: FieldDefinition[];
  enabledFields: string[];
  defaultFields: FieldDefinition[];
  onToggleField: (fieldId: string) => void;
  onMoveField: (fieldId: string, direction: 'up' | 'down') => void;
}

const FieldsSettings: React.FC<FieldsSettingsProps> = ({
  orderedFields,
  enabledFields,
  defaultFields,
  onToggleField,
  onMoveField,
}) => {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('settings.fields.title')}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t('settings.fields.desc')}
      </p>

      <div className="mt-4 border border-gray-100 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
        {orderedFields.map((field, index) => {
          const isEnabled = enabledFields.includes(field.id);
          const isCustom = !defaultFields.find((f) => f.id === field.id);
          return (
            <div
              key={field.id}
              className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="flex items-center gap-3">
                <input
                  id={`field-${field.id}`}
                  name={`field-${field.id}`}
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => onToggleField(field.id)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded"
                />
                <div>
                  <label
                    htmlFor={`field-${field.id}`}
                    className="text-sm font-medium text-gray-800 dark:text-white"
                  >
                    {!isCustom ? t(`fields.${field.id}`, field.label) : field.label}
                    {isCustom && (
                      <span className="ml-2 text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-900/50 px-2 py-0.5 rounded">
                        Custom
                      </span>
                    )}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {field.required ? t('settings.fields.required') : t('settings.fields.optional')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onMoveField(field.id, 'up')}
                  disabled={index === 0}
                  className={`px-2 py-1 rounded-md text-xs font-medium border ${
                    index === 0
                      ? 'text-gray-300 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                      : 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onMoveField(field.id, 'down')}
                  disabled={index === orderedFields.length - 1}
                  className={`px-2 py-1 rounded-md text-xs font-medium border ${
                    index === orderedFields.length - 1
                      ? 'text-gray-300 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                      : 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  ↓
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
