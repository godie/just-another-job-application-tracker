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
    <div className="space-y-8">
      {/* Form Section */}
      <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </span>
          {editingCustomField ? t('settings.custom.edit') : t('settings.custom.add')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-1">
            <label htmlFor="custom-field-label" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.custom.label')}
            </label>
            <input
              id="custom-field-label"
              type="text"
              value={customFieldForm.label || ''}
              onChange={(e) => setCustomFieldForm({ ...customFieldForm, label: e.target.value })}
              placeholder="e.g., Recruiter Phone"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm transition-all"
            />
          </div>

          <div className="sm:col-span-1">
            <label htmlFor="custom-field-type" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm transition-all"
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
              <label htmlFor="custom-field-options" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
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
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm transition-all"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                {t('settings.custom.optionsDesc')}
              </p>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                id="required-field"
                name="required-field"
                checked={customFieldForm.required || false}
                onChange={(e) =>
                  setCustomFieldForm({ ...customFieldForm, required: e.target.checked })
                }
                className="h-5 w-5 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 transition-all cursor-pointer"
              />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {t('settings.custom.required')}
              </span>
            </label>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          {editingCustomField ? (
            <>
              <button
                type="button"
                onClick={onUpdateCustomField}
                disabled={!customFieldForm.label}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${
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
                className="px-6 py-2.5 rounded-xl text-sm font-bold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                {t('common.cancel')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onAddCustomField}
              disabled={!customFieldForm.label || (customFieldForm.type === 'select' && (!customFieldForm.options || customFieldForm.options.length === 0))}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${
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

      {/* List Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
          {t('settings.custom.title')}
        </h3>

        {customFields && customFields.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {customFields.map((field) => (
              <div
                key={field.id}
                className="flex items-center justify-between p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:shadow-lg transition-all group"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">{field.label}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                      {field.type}
                    </span>
                    {field.required && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-100 dark:border-red-800">
                        {t('settings.custom.required')}
                      </span>
                    )}
                  </div>
                  {field.options && field.options.length > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex gap-1 flex-wrap">
                      {field.options.map((opt, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-gray-50 dark:bg-gray-700 rounded border border-gray-100 dark:border-gray-600">
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => onEditCustomField(field)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCustomField(field.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.custom.noCustom')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomFieldsSettings;
