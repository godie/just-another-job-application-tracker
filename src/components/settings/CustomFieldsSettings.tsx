import React from 'react';
import { useTranslation } from 'react-i18next';
import { type FieldDefinition } from '../../utils/localStorage';

interface CustomFieldsSettingsProps {
  customFields: FieldDefinition[];
  editingCustomField: FieldDefinition | null;
  customFieldForm: Partial<FieldDefinition>;
  setCustomFieldForm: (form: Partial<FieldDefinition>) => void;
  onAddCustomField: () => void;
  onEditCustomField: (field: FieldDefinition) => void;
  onUpdateCustomField: () => void;
  onDeleteCustomField: (fieldId: string) => void;
  onCancelEdit: () => void;
}

const CustomFieldsSettings: React.FC<CustomFieldsSettingsProps> = ({
  customFields,
  editingCustomField,
  customFieldForm,
  setCustomFieldForm,
  onAddCustomField,
  onEditCustomField,
  onUpdateCustomField,
  onDeleteCustomField,
  onCancelEdit,
}) => {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('settings.custom.title')}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t('settings.custom.desc')}
      </p>

      {/* Add/Edit Custom Field Form */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
          {editingCustomField ? t('settings.custom.edit') : t('settings.custom.add')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="custom-field-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('settings.custom.label')}
            </label>
            <input
              id="custom-field-label"
              type="text"
              value={customFieldForm.label || ''}
              onChange={(e) => setCustomFieldForm({ ...customFieldForm, label: e.target.value })}
              placeholder="e.g., Recruiter Phone"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="custom-field-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('settings.custom.type')}
            </label>
            <select
              id="custom-field-type"
              value={customFieldForm.type || 'text'}
              onChange={(e) =>
                setCustomFieldForm({
                  ...customFieldForm,
                  type: e.target.value as FieldDefinition['type'],
                  options: e.target.value === 'select' ? [] : undefined,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="text">{t('settings.custom.types.text')}</option>
              <option value="date">{t('settings.custom.types.date')}</option>
              <option value="number">{t('settings.custom.types.number')}</option>
              <option value="select">{t('settings.custom.types.select')}</option>
              <option value="checkbox">{t('settings.custom.types.checkbox')}</option>
              <option value="url">{t('settings.custom.types.url')}</option>
            </select>
          </div>
          {customFieldForm.type === 'select' && (
            <div className="sm:col-span-2">
              <label htmlFor="custom-field-options" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.custom.options')}
              </label>
              <textarea
                id="custom-field-options"
                value={(customFieldForm.options || []).join('\n')}
                onChange={(e) =>
                  setCustomFieldForm({
                    ...customFieldForm,
                    options: e.target.value.split('\n').filter((opt) => opt.trim()),
                  })
                }
                placeholder="Remote&#10;Hybrid&#10;On-site"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('settings.custom.optionsDesc')}
              </p>
            </div>
          )}
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="required-field"
              name="required-field"
              checked={customFieldForm.required || false}
              onChange={(e) =>
                setCustomFieldForm({ ...customFieldForm, required: e.target.checked })
              }
              className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded"
            />
            <label htmlFor="required-field" className="text-sm text-gray-700 dark:text-gray-300">
              {t('settings.custom.required')}
            </label>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {editingCustomField ? (
            <>
              <button
                type="button"
                onClick={onUpdateCustomField}
                disabled={!customFieldForm.label}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  customFieldForm.label
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {t('settings.custom.update')}
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onAddCustomField}
              disabled={!customFieldForm.label || (customFieldForm.type === 'select' && (!customFieldForm.options || customFieldForm.options.length === 0))}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                customFieldForm.label && (customFieldForm.type !== 'select' || (customFieldForm.options && customFieldForm.options.length > 0))
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {t('settings.custom.addField')}
            </button>
          )}
        </div>
      </div>

      {/* Custom Fields List */}
      {customFields && customFields.length > 0 ? (
        <div className="border border-gray-100 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
          {customFields.map((field) => (
            <div
              key={field.id}
              className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div>
                <div className="font-medium text-gray-800 dark:text-white">
                  {field.label}
                  <span className="ml-2 text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-900/50 px-2 py-0.5 rounded">
                    {field.type}
                  </span>
                  {field.required && (
                    <span className="ml-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/50 px-2 py-0.5 rounded">
                    {t('settings.custom.required')}
                    </span>
                  )}
                </div>
                {field.options && field.options.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Options: {field.options.join(', ')}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEditCustomField(field)}
                  className="px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-300 dark:border-indigo-700 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/50"
                >
                  {t('common.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteCustomField(field.id)}
                  className="px-3 py-1 text-xs font-medium text-red-600 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/50"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">{t('settings.custom.noCustom')}</p>
        </div>
      )}
    </div>
  );
};

export default CustomFieldsSettings;
