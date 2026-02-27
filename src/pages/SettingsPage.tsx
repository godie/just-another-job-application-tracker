import React, { useEffect, useReducer } from 'react';
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
import { useAuthStore } from '../stores/authStore';

import FieldsSettings from '../components/settings/FieldsSettings';
import ViewSettings from '../components/settings/ViewSettings';
import DateFormatSettings from '../components/settings/DateFormatSettings';
import CustomFieldsSettings from '../components/settings/CustomFieldsSettings';
import ATSSearchSettings from '../components/settings/ATSSearchSettings';
import InterviewingSettings from '../components/settings/InterviewingSettings';
import EmailScanSettings from '../components/settings/EmailScanSettings';

import { type PageType } from '../App';

interface SettingsPageProps {
  onNavigate?: (page: PageType) => void;
}

interface SettingsPageState {
  hasChanges: boolean;
  activeSection: 'fields' | 'view' | 'date' | 'custom' | 'interviewing' | 'atsSearch' | 'emailScan' | 'cloud';
  editingCustomField: FieldDefinition | null;
  customFieldForm: Partial<FieldDefinition>;
  editingInterviewEvent: CustomInterviewEvent | null;
  interviewEventForm: Partial<CustomInterviewEvent>;
}

type SettingsPageAction =
  | { type: 'SET_FIELD'; field: keyof SettingsPageState; value: boolean | string | FieldDefinition | CustomInterviewEvent | Partial<FieldDefinition> | Partial<CustomInterviewEvent> | null }
  | { type: 'SET_CUSTOM_FIELD_FORM'; value: Partial<FieldDefinition> }
  | { type: 'SET_INTERVIEW_EVENT_FORM'; value: Partial<CustomInterviewEvent> }
  | { type: 'RESET_FORMS' };

const settingsPageReducer = (state: SettingsPageState, action: SettingsPageAction): SettingsPageState => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_CUSTOM_FIELD_FORM':
      return { ...state, customFieldForm: { ...state.customFieldForm, ...action.value } };
    case 'SET_INTERVIEW_EVENT_FORM':
      return { ...state, interviewEventForm: { ...state.interviewEventForm, ...action.value } };
    case 'RESET_FORMS':
      return {
        ...state,
        editingCustomField: null,
        customFieldForm: { label: '', type: 'text', required: false, options: [] },
        editingInterviewEvent: null,
        interviewEventForm: { label: '' },
      };
    default:
      return state;
  }
};

const SettingsPageContent: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { showSuccess } = useAlert();
  
  // Use Zustand stores
  const { user, isAuthenticated, logout } = useAuthStore();
  const preferences = usePreferencesStore((state) => state.preferences);
  const loadPreferences = usePreferencesStore((state) => state.loadPreferences);
  const updatePreferences = usePreferencesStore((state) => state.updatePreferences);
  const resetPreferences = usePreferencesStore((state) => state.resetPreferences);
  
  const [state, dispatch] = useReducer(settingsPageReducer, {
    hasChanges: false,
    activeSection: 'fields',
    editingCustomField: null,
    customFieldForm: {
      label: '',
      type: 'text',
      required: false,
      options: [],
    },
    editingInterviewEvent: null,
    interviewEventForm: {
      label: '',
    },
  });

  const {
    hasChanges,
    activeSection,
    editingCustomField,
    customFieldForm,
    editingInterviewEvent,
    interviewEventForm,
  } = state;

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
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  };

  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    const order = [...preferences.columnOrder];
    const index = order.indexOf(fieldId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= order.length) return;

    [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
    updatePreferences({ columnOrder: order });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  };

  const handleDefaultViewChange = (view: ViewType) => {
    updatePreferences({ defaultView: view });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  };

  const handleDateFormatChange = (format: DateFormat) => {
    updatePreferences({ dateFormat: format });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
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
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });

    dispatch({ type: 'RESET_FORMS' });
  };

  const handleEditCustomField = (field: FieldDefinition) => {
    dispatch({ type: 'SET_FIELD', field: 'editingCustomField', value: field });
    dispatch({
      type: 'SET_FIELD',
      field: 'customFieldForm',
      value: {
        label: field.label,
        type: field.type,
        required: field.required,
        options: field.options || [],
      },
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
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });

    dispatch({ type: 'RESET_FORMS' });
  };

  const handleDeleteCustomField = (fieldId: string) => {
    const customFields = (preferences.customFields || []).filter((f) => f.id !== fieldId);
    const enabledFields = preferences.enabledFields.filter((id) => id !== fieldId);
    const columnOrder = preferences.columnOrder.filter((id) => id !== fieldId);
    updatePreferences({ customFields, enabledFields, columnOrder });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  };

  const handleAddInterviewEvent = () => {
    if (!interviewEventForm.label) return;
    
    const newEvent: CustomInterviewEvent = {
      id: `interview-event-${generateId()}`,
      label: interviewEventForm.label,
    };

    const customInterviewEvents = [...(preferences.customInterviewEvents || []), newEvent];
    updatePreferences({ customInterviewEvents });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });

    dispatch({ type: 'RESET_FORMS' });
  };

  const handleEditInterviewEvent = (event: CustomInterviewEvent) => {
    dispatch({ type: 'SET_FIELD', field: 'editingInterviewEvent', value: event });
    dispatch({
      type: 'SET_FIELD',
      field: 'interviewEventForm',
      value: {
        label: event.label,
      },
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
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });

    dispatch({ type: 'RESET_FORMS' });
  };

  const handleDeleteInterviewEvent = (eventId: string) => {
    const customInterviewEvents = (preferences.customInterviewEvents || []).filter((e) => e.id !== eventId);
    updatePreferences({ customInterviewEvents });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  };

  const handleReset = () => {
    resetPreferences();
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
    dispatch({ type: 'RESET_FORMS' });
  };

  const handleSave = () => {
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: false });
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
    { id: 'atsSearch' as const, label: t('opportunities.atsSearch.title'), icon: '🔍' },
    { id: 'emailScan' as const, label: t('settings.emailScan.section'), icon: '📧' },
    { id: 'cloud' as const, label: 'Cloud Sync', icon: '☁️' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{t('settings.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('settings.subtitle')}
          </p>
        </div>

        {/* Section Navigation */}
        <div className="mb-6 flex flex-wrap gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => dispatch({ type: 'SET_FIELD', field: 'activeSection', value: section.id })}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeSection === section.id
                  ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span>{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>

        {/* Save/Reset Controls */}
        <div className="mb-6 flex justify-between items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
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
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 sm:p-8">
          <SettingsSectionContent
            activeSection={activeSection}
            orderedFields={orderedFields}
            preferences={preferences}
            editingCustomField={editingCustomField}
            customFieldForm={customFieldForm}
            editingInterviewEvent={editingInterviewEvent}
            interviewEventForm={interviewEventForm}
            onToggleField={handleToggleField}
            onMoveField={handleMoveField}
            onDefaultViewChange={handleDefaultViewChange}
            onDateFormatChange={handleDateFormatChange}
            onAddCustomField={handleAddCustomField}
            onEditCustomField={handleEditCustomField}
            onUpdateCustomField={handleUpdateCustomField}
            onDeleteCustomField={handleDeleteCustomField}
            onAddInterviewEvent={handleAddInterviewEvent}
            onEditInterviewEvent={handleEditInterviewEvent}
            onUpdateInterviewEvent={handleUpdateInterviewEvent}
            onDeleteInterviewEvent={handleDeleteInterviewEvent}
            updatePreferences={updatePreferences}
            dispatch={dispatch}
            isAuthenticated={isAuthenticated}
            user={user}
            logout={logout}
            showSuccess={showSuccess}
            onNavigate={onNavigate}
          />
        </div>
      <Footer version={packageJson.version} />
    </div>
  );
};

interface SettingsSectionContentProps {
  activeSection: string;
  orderedFields: FieldDefinition[];
  preferences: ReturnType<typeof usePreferencesStore>["preferences"];
  editingCustomField: FieldDefinition | null;
  customFieldForm: Partial<FieldDefinition>;
  editingInterviewEvent: CustomInterviewEvent | null;
  interviewEventForm: Partial<CustomInterviewEvent>;
  onToggleField: (fieldId: string) => void;
  onMoveField: (fieldId: string, direction: 'up' | 'down') => void;
  onDefaultViewChange: (view: ViewType) => void;
  onDateFormatChange: (format: DateFormat) => void;
  onAddCustomField: () => void;
  onEditCustomField: (field: FieldDefinition) => void;
  onUpdateCustomField: () => void;
  onDeleteCustomField: (fieldId: string) => void;
  onAddInterviewEvent: () => void;
  onEditInterviewEvent: (event: CustomInterviewEvent) => void;
  onUpdateInterviewEvent: () => void;
  onDeleteInterviewEvent: (eventId: string) => void;
  updatePreferences: (prefs: Partial<ReturnType<typeof usePreferencesStore>["preferences"]>) => void;
  dispatch: React.Dispatch<SettingsPageAction>;
  isAuthenticated: boolean;
  user: ReturnType<typeof useAuthStore>["user"];
  logout: () => void;
  showSuccess: (msg: string) => void;
  onNavigate?: (page: PageType) => void;
}

const SettingsSectionContent: React.FC<SettingsSectionContentProps> = ({
  activeSection,
  orderedFields,
  preferences,
  editingCustomField,
  customFieldForm,
  editingInterviewEvent,
  interviewEventForm,
  onToggleField,
  onMoveField,
  onDefaultViewChange,
  onDateFormatChange,
  onAddCustomField,
  onEditCustomField,
  onUpdateCustomField,
  onDeleteCustomField,
  onAddInterviewEvent,
  onEditInterviewEvent,
  onUpdateInterviewEvent,
  onDeleteInterviewEvent,
  updatePreferences,
  dispatch,
  isAuthenticated,
  user,
  logout,
  showSuccess,
  onNavigate,
}) => {
  switch (activeSection) {
    case 'fields':
      return (
        <FieldsSettings
          orderedFields={orderedFields}
          enabledFields={preferences.enabledFields}
          defaultFields={DEFAULT_FIELDS}
          onToggleField={onToggleField}
          onMoveField={onMoveField}
        />
      );
    case 'view':
      return (
        <ViewSettings
          defaultView={preferences.defaultView}
          onDefaultViewChange={onDefaultViewChange}
        />
      );
    case 'date':
      return (
        <DateFormatSettings
          currentFormat={preferences.dateFormat}
          onDateFormatChange={onDateFormatChange}
        />
      );
    case 'custom':
      return (
        <CustomFieldsSettings
          customFields={preferences.customFields || []}
          editingCustomField={editingCustomField}
          customFieldForm={customFieldForm}
          setCustomFieldForm={(value) => dispatch({ type: 'SET_CUSTOM_FIELD_FORM', value })}
          onAddCustomField={onAddCustomField}
          onEditCustomField={onEditCustomField}
          onUpdateCustomField={onUpdateCustomField}
          onDeleteCustomField={onDeleteCustomField}
          onCancelEdit={() => dispatch({ type: 'RESET_FORMS' })}
        />
      );
    case 'emailScan':
      return (
        <EmailScanSettings
          emailScanMonths={preferences.emailScanMonths || 3}
          enabledChatbots={preferences.enabledChatbots || ['ChatGPT', 'Claude', 'Gemini']}
          onEmailScanMonthsChange={(months) => {
            updatePreferences({ emailScanMonths: months });
            dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
          }}
          onChatbotToggle={(chatbotId) => {
            const current = preferences.enabledChatbots || ['ChatGPT', 'Claude', 'Gemini'];
            const enabledChatbots = current.includes(chatbotId)
              ? current.filter((id: string) => id !== chatbotId)
              : [...current, chatbotId];
            updatePreferences({ enabledChatbots });
            dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
          }}
        />
      );
    case 'atsSearch':
      return (
        <ATSSearchSettings
          atsSearch={preferences.atsSearch}
          onAtsSearchChange={(key, value) => {
            updatePreferences({
              atsSearch: { ...preferences.atsSearch!, [key]: value }
            });
            dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
          }}
        />
      );
    case 'interviewing':
      return (
        <InterviewingSettings
          customInterviewEvents={preferences.customInterviewEvents || []}
          editingInterviewEvent={editingInterviewEvent}
          interviewEventForm={interviewEventForm}
          setInterviewEventForm={(value) => dispatch({ type: 'SET_INTERVIEW_EVENT_FORM', value })}
          onAddInterviewEvent={onAddInterviewEvent}
          onEditInterviewEvent={onEditInterviewEvent}
          onUpdateInterviewEvent={onUpdateInterviewEvent}
          onDeleteInterviewEvent={onDeleteInterviewEvent}
          onCancelEdit={() => dispatch({ type: 'RESET_FORMS' })}
        />
      );
    case 'cloud':
      return (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Cloud Synchronization</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Keep your applications and opportunities in sync across all your devices.
          </p>

          <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
            {isAuthenticated ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Logged in as</p>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{user?.email}</p>
                  <p className="text-xs text-gray-500 mt-1">✓ Your data is being synchronized automatically.</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    showSuccess('Logged out successfully');
                  }}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-red-300 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 dark:text-gray-300 mb-4">Sync is currently disabled. Log in to enable cloud features.</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => onNavigate?.('landing')}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 shadow-sm"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => onNavigate?.('landing')}
                    className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    default:
      return null;
  }
};

const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  return <SettingsPageContent onNavigate={onNavigate} />;
};

export default SettingsPage;
