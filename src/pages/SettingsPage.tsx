import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';
import { useAlert } from '../components/AlertProvider';
import {
  DEFAULT_FIELDS,
  type FieldDefinition,
  type ViewType,
  type DateFormat,
  type CustomInterviewEvent,
  generateId,
} from '../utils/localStorage';
import packageJson from '../../package.json';
import { usePreferencesStore } from '../stores/preferencesStore';

import { type PageType } from '../App';

interface SettingsPageProps {
  onNavigate?: (page: PageType) => void;
}

const SettingsPageContent: React.FC<SettingsPageProps> = () => {
  const { t } = useTranslation();
  const { showSuccess } = useAlert();
  
  // Use Zustand store
  const preferences = usePreferencesStore((state) => state.preferences);
  const loadPreferences = usePreferencesStore((state) => state.loadPreferences);
  const updatePreferences = usePreferencesStore((state) => state.updatePreferences);
  const resetPreferences = usePreferencesStore((state) => state.resetPreferences);
  
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState<'fields' | 'view' | 'date' | 'custom' | 'interviewing'>('fields');
  const [editingCustomField, setEditingCustomField] = useState<FieldDefinition | null>(null);
  const [customFieldForm, setCustomFieldForm] = useState<Partial<FieldDefinition>>({
    label: '',
    type: 'text',
    required: false,
    options: [],
  });
  const [editingInterviewEvent, setEditingInterviewEvent] = useState<CustomInterviewEvent | null>(null);
  const [interviewEventForm, setInterviewEventForm] = useState<Partial<CustomInterviewEvent>>({
    label: '',
  });

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const allFields: FieldDefinition[] = [...DEFAULT_FIELDS, ...(preferences.customFields || [])];

  const handleToggleField = (fieldId: string) => {
    const isEnabled = preferences.enabledFields.includes(fieldId);
    const enabledFields = isEnabled
      ? preferences.enabledFields.filter((id) => id !== fieldId)
      : [...preferences.enabledFields, fieldId];
    updatePreferences({ enabledFields });
    setHasChanges(true);
  };

  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    const order = [...preferences.columnOrder];
    const index = order.indexOf(fieldId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= order.length) return;

    [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
    updatePreferences({ columnOrder: order });
    setHasChanges(true);
  };

  const handleDefaultViewChange = (view: ViewType) => {
    updatePreferences({ defaultView: view });
    setHasChanges(true);
  };

  const handleDateFormatChange = (format: DateFormat) => {
    updatePreferences({ dateFormat: format });
    setHasChanges(true);
  };

  const handleAddCustomField = () => {
    if (!customFieldForm.label || !customFieldForm.type) return;
    
    const newField: FieldDefinition = {
      id: `custom-${generateId()}`,
      label: customFieldForm.label,
      type: customFieldForm.type as FieldDefinition['type'],
      required: customFieldForm.required || false,
      options: customFieldForm.type === 'select' ? (customFieldForm.options || []) : undefined,
    };

    const customFields = [...(preferences.customFields || []), newField];
    const enabledFields = [...preferences.enabledFields, newField.id];
    const columnOrder = [...preferences.columnOrder, newField.id];
    updatePreferences({ customFields, enabledFields, columnOrder });
    setHasChanges(true);

    setCustomFieldForm({ label: '', type: 'text', required: false, options: [] });
    setEditingCustomField(null);
  };

  const handleEditCustomField = (field: FieldDefinition) => {
    setEditingCustomField(field);
    setCustomFieldForm({
      label: field.label,
      type: field.type,
      required: field.required,
      options: field.options || [],
    });
  };

  const handleUpdateCustomField = () => {
    if (!editingCustomField || !customFieldForm.label) return;

    const customFields = (preferences.customFields || []).map((field) =>
      field.id === editingCustomField.id
        ? {
            ...field,
            label: customFieldForm.label!,
            type: customFieldForm.type as FieldDefinition['type'],
            required: customFieldForm.required || false,
            options: customFieldForm.type === 'select' ? (customFieldForm.options || []) : undefined,
          }
        : field
    );
    updatePreferences({ customFields });
    setHasChanges(true);

    setCustomFieldForm({ label: '', type: 'text', required: false, options: [] });
    setEditingCustomField(null);
  };

  const handleDeleteCustomField = (fieldId: string) => {
    const customFields = (preferences.customFields || []).filter((f) => f.id !== fieldId);
    const enabledFields = preferences.enabledFields.filter((id) => id !== fieldId);
    const columnOrder = preferences.columnOrder.filter((id) => id !== fieldId);
    updatePreferences({ customFields, enabledFields, columnOrder });
    setHasChanges(true);
  };

  const handleAddInterviewEvent = () => {
    if (!interviewEventForm.label) return;
    
    const newEvent: CustomInterviewEvent = {
      id: `interview-event-${generateId()}`,
      label: interviewEventForm.label,
    };

    const customInterviewEvents = [...(preferences.customInterviewEvents || []), newEvent];
    updatePreferences({ customInterviewEvents });
    setHasChanges(true);

    setInterviewEventForm({ label: '' });
    setEditingInterviewEvent(null);
  };

  const handleEditInterviewEvent = (event: CustomInterviewEvent) => {
    setEditingInterviewEvent(event);
    setInterviewEventForm({
      label: event.label,
    });
  };

  const handleUpdateInterviewEvent = () => {
    if (!editingInterviewEvent || !interviewEventForm.label) return;

    const customInterviewEvents = (preferences.customInterviewEvents || []).map((event) =>
      event.id === editingInterviewEvent.id
        ? {
            ...event,
            label: interviewEventForm.label!,
          }
        : event
    );
    updatePreferences({ customInterviewEvents });
    setHasChanges(true);

    setInterviewEventForm({ label: '' });
    setEditingInterviewEvent(null);
  };

  const handleDeleteInterviewEvent = (eventId: string) => {
    const customInterviewEvents = (preferences.customInterviewEvents || []).filter((e) => e.id !== eventId);
    updatePreferences({ customInterviewEvents });
    setHasChanges(true);
  };

  const handleReset = () => {
    resetPreferences();
    setHasChanges(true);
    setCustomFieldForm({ label: '', type: 'text', required: false, options: [] });
    setEditingCustomField(null);
    setInterviewEventForm({ label: '' });
    setEditingInterviewEvent(null);
  };

  const handleSave = () => {
    // Preferences are already saved automatically by the store
    setHasChanges(false);
    showSuccess(t('settings.success'));
  };

  // Build ordered list of fields based on columnOrder
  const orderedFields = preferences.columnOrder
    .map((id) => allFields.find((field) => field.id === id))
    .filter((field): field is FieldDefinition => Boolean(field));

  const sections = [
    { id: 'fields' as const, label: t('settings.sections.fields'), icon: '📋' },
    { id: 'view' as const, label: t('settings.sections.view'), icon: '👁️' },
    { id: 'date' as const, label: t('settings.sections.date'), icon: '📅' },
    { id: 'custom' as const, label: t('settings.sections.custom'), icon: '➕' },
    { id: 'interviewing' as const, label: t('settings.sections.interviewing'), icon: '🎯' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white dark:text-white mb-2">{t('settings.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
            {t('settings.subtitle')}
          </p>
        </div>

        {/* Section Navigation */}
        <div className="mb-6 flex flex-wrap gap-2 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeSection === section.id
                  ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:bg-gray-700'
              }`}
            >
              <span>{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>

        {/* Save/Reset Controls */}
        <div className="mb-6 flex justify-between items-center bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700 p-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges}
              className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm transition ${
                hasChanges
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {t('settings.saveChanges')}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition"
            >
              {t('settings.resetDefault')}
            </button>
          </div>
          {hasChanges && (
            <span className="text-xs text-amber-600 font-medium">
              {t('settings.unsavedChanges')}
            </span>
          )}
        </div>

        {/* Section Content */}
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow-lg rounded-xl p-6 sm:p-8">
          {/* Table Fields Section */}
          {activeSection === 'fields' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white dark:text-white mb-2">{t('settings.fields.title')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-6">
                {t('settings.fields.desc')}
              </p>

              <div className="mt-4 border border-gray-100 rounded-lg divide-y divide-gray-100">
                {orderedFields.map((field, index) => {
                  const isEnabled = preferences.enabledFields.includes(field.id);
                  const isCustom = !DEFAULT_FIELDS.find((f) => f.id === field.id);
                  return (
                    <div
                      key={field.id}
                      className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          id={`field-${field.id}`}
                          name={`field-${field.id}`}
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => handleToggleField(field.id)}
                          className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <div>
                          <label
                            htmlFor={`field-${field.id}`}
                            className="text-sm font-medium text-gray-800 dark:text-white"
                          >
                            {!isCustom ? t(`fields.${field.id}`, field.label) : field.label}
                            {isCustom && (
                              <span className="ml-2 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
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
                          onClick={() => handleMoveField(field.id, 'up')}
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
                          onClick={() => handleMoveField(field.id, 'down')}
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
          )}

          {/* Default View Section */}
          {activeSection === 'view' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white dark:text-white mb-2">{t('settings.view.title')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-6">
                {t('settings.view.desc')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['table', 'timeline', 'kanban', 'calendar'] as ViewType[]).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => handleDefaultViewChange(view)}
                    className={`p-4 rounded-lg border-2 transition ${
                      preferences.defaultView === view
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-semibold text-gray-800 dark:text-white capitalize mb-1">{t(`views.${view}`)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t(`settings.view.${view}`)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date Format Section */}
          {activeSection === 'date' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white dark:text-white mb-2">{t('settings.sections.date')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-6">
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
                        preferences.dateFormat === format
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="dateFormat"
                        value={format}
                        checked={preferences.dateFormat === format}
                        onChange={() => handleDateFormatChange(format)}
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
          )}

          {/* Custom Fields Section */}
          {activeSection === 'custom' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('settings.custom.title')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {t('settings.custom.desc')}
              </p>

              {/* Add/Edit Custom Field Form */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  {editingCustomField ? t('settings.custom.edit') : t('settings.custom.add')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('settings.custom.label')}
                    </label>
                    <input
                      type="text"
                      value={customFieldForm.label || ''}
                      onChange={(e) => setCustomFieldForm({ ...customFieldForm, label: e.target.value })}
                      placeholder="e.g., Recruiter Phone"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('settings.custom.type')}
                    </label>
                    <select
                      value={customFieldForm.type || 'text'}
                      onChange={(e) =>
                        setCustomFieldForm({
                          ...customFieldForm,
                          type: e.target.value as FieldDefinition['type'],
                          options: e.target.value === 'select' ? [] : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('settings.custom.options')}
                      </label>
                      <textarea
                        value={(customFieldForm.options || []).join('\n')}
                        onChange={(e) =>
                          setCustomFieldForm({
                            ...customFieldForm,
                            options: e.target.value.split('\n').filter((opt) => opt.trim()),
                          })
                        }
                        placeholder="Remote&#10;Hybrid&#10;On-site"
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
                        onClick={handleUpdateCustomField}
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
                        onClick={() => {
                          setEditingCustomField(null);
                          setCustomFieldForm({ label: '', type: 'text', required: false, options: [] });
                        }}
                        className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
                      >
                        {t('common.cancel')}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddCustomField}
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
              {preferences.customFields && preferences.customFields.length > 0 ? (
                <div className="border border-gray-100 rounded-lg divide-y divide-gray-100">
                  {preferences.customFields.map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
                    >
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white">
                          {field.label}
                          <span className="ml-2 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {field.type}
                          </span>
                          {field.required && (
                            <span className="ml-2 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
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
                          onClick={() => handleEditCustomField(field)}
                          className="px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-300 rounded hover:bg-indigo-50"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomField(field.id)}
                          className="px-3 py-1 text-xs font-medium text-red-600 border border-red-300 rounded hover:bg-red-50"
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
          )}

          {/* Interview Events Section */}
          {activeSection === 'interviewing' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('settings.interviewing.title')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {t('settings.interviewing.desc')}
              </p>

              {/* Add/Edit Interview Event Form */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  {editingInterviewEvent ? t('settings.interviewing.edit') : t('settings.interviewing.add')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('settings.interviewing.label')}
                    </label>
                    <input
                      type="text"
                      value={interviewEventForm.label || ''}
                      onChange={(e) => setInterviewEventForm({ ...interviewEventForm, label: e.target.value })}
                      placeholder="e.g., Phone Screen, Panel Interview"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  {editingInterviewEvent ? (
                    <>
                      <button
                        type="button"
                        onClick={handleUpdateInterviewEvent}
                        disabled={!interviewEventForm.label}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                          interviewEventForm.label
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-200 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {t('settings.interviewing.update')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingInterviewEvent(null);
                          setInterviewEventForm({ label: '' });
                        }}
                        className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
                      >
                        {t('common.cancel')}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddInterviewEvent}
                      disabled={!interviewEventForm.label}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        interviewEventForm.label
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-gray-200 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {t('settings.interviewing.addEvent')}
                    </button>
                  )}
                </div>
              </div>

              {/* Interview Events List */}
              {preferences.customInterviewEvents && preferences.customInterviewEvents.length > 0 ? (
                <div className="border border-gray-100 rounded-lg divide-y divide-gray-100">
                  {preferences.customInterviewEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
                    >
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white">
                          {event.label}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditInterviewEvent(event)}
                          className="px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-300 rounded hover:bg-indigo-50"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteInterviewEvent(event.id)}
                          className="px-3 py-1 text-xs font-medium text-red-600 border border-red-300 rounded hover:bg-red-50"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">{t('settings.interviewing.noEvents')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      <Footer version={packageJson.version} />
    </div>
  );
};

const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  return <SettingsPageContent onNavigate={onNavigate} />;
};

export default SettingsPage;
