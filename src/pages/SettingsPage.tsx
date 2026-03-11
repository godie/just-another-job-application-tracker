import React, { useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '../stores/preferencesStore';
import { useAuthStore } from '../stores/authStore';
import { useAlert } from '../components/AlertProvider';
import { DEFAULT_FIELDS } from '../utils/constants';
import { type FieldDefinition, type ViewType, type DateFormat } from '../types/preferences';
import FieldsSettings from '../components/settings/FieldsSettings';
import ViewSettings from '../components/settings/ViewSettings';
import DateFormatSettings from '../components/settings/DateFormatSettings';
import CustomFieldsSettings from '../components/settings/CustomFieldsSettings';
import InterviewingSettings from '../components/settings/InterviewingSettings';
import EmailScanSettings from '../components/settings/EmailScanSettings';
import ATSSearchSettings from '../components/settings/ATSSearchSettings';
import Footer from '../components/Footer';
import packageJson from '../../package.json';

interface SettingsPageProps {
  onNavigate?: (page: any) => void;
}

type SettingsSection = 'fields' | 'view' | 'date' | 'custom' | 'interviewing' | 'emailScan' | 'atsSearch' | 'cloud';

interface SettingsState {
  activeSection: SettingsSection;
  hasChanges: boolean;
  editingCustomField: FieldDefinition | null;
  customFieldForm: Partial<FieldDefinition>;
  editingInterviewEvent: any | null;
  interviewEventForm: any;
}

type SettingsAction =
  | { type: 'SET_FIELD'; field: keyof SettingsState; value: any }
  | { type: 'SET_CUSTOM_FIELD_FORM'; value: Partial<FieldDefinition> }
  | { type: 'SET_INTERVIEW_EVENT_FORM'; value: any }
  | { type: 'RESET_FORMS' };

const initialState: SettingsState = {
  activeSection: 'view',
  hasChanges: false,
  editingCustomField: null,
  customFieldForm: { type: 'text' },
  editingInterviewEvent: null,
  interviewEventForm: { type: 'first_contact', status: 'completed' },
};

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_CUSTOM_FIELD_FORM':
      return { ...state, customFieldForm: action.value };
    case 'SET_INTERVIEW_EVENT_FORM':
      return { ...state, interviewEventForm: action.value };
    case 'RESET_FORMS':
      return {
        ...state,
        editingCustomField: null,
        customFieldForm: { type: 'text' },
        editingInterviewEvent: null,
        interviewEventForm: { type: 'first_contact', status: 'completed' },
      };
    default:
      return state;
  }
}

const SettingsPageContent: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { preferences, updatePreferences, resetPreferences } = usePreferencesStore();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { showSuccess } = useAlert();
  const [state, dispatch] = useReducer(settingsReducer, initialState);

  const {
    activeSection,
    hasChanges,
    editingCustomField,
    customFieldForm,
    editingInterviewEvent,
    interviewEventForm,
  } = state;

  const handleToggleField = (fieldId: string) => {
    const enabledFields = preferences.enabledFields.includes(fieldId)
      ? preferences.enabledFields.filter((id: string) => id !== fieldId)
      : [...preferences.enabledFields, fieldId];
    updatePreferences({ enabledFields });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  };

  const handleMoveField = (dragIndex: number, hoverIndex: number) => {
    const newOrder = [...preferences.columnOrder];
    const dragField = newOrder[dragIndex];
    newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, dragField);
    updatePreferences({ columnOrder: newOrder });
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
    const id = `custom_${Date.now()}`;
    const newField = { ...customFieldForm, id } as FieldDefinition;
    const customFields = [...(preferences.customFields || []), newField];
    const enabledFields = [...preferences.enabledFields, id];
    const columnOrder = [...preferences.columnOrder, id];
    updatePreferences({ customFields, enabledFields, columnOrder });
    dispatch({ type: 'RESET_FORMS' });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  };

  const handleEditCustomField = (field: FieldDefinition) => {
    dispatch({ type: 'SET_FIELD', field: 'editingCustomField', value: field });
    dispatch({ type: 'SET_CUSTOM_FIELD_FORM', value: field });
  };

  const handleUpdateCustomField = () => {
    const customFields = (preferences.customFields || []).map((f: FieldDefinition) =>
      f.id === editingCustomField?.id ? { ...f, ...customFieldForm } : f
    );
    updatePreferences({ customFields });
    dispatch({ type: 'RESET_FORMS' });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  };

  const handleDeleteCustomField = (fieldId: string) => {
    const customFields = (preferences.customFields || []).filter((f: FieldDefinition) => f.id !== fieldId);
    const enabledFields = preferences.enabledFields.filter((id: string) => id !== fieldId);
    const columnOrder = preferences.columnOrder.filter((id: string) => id !== fieldId);
    updatePreferences({ customFields, enabledFields, columnOrder });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  };

  const handleAddInterviewEvent = () => {
    const id = `event_${Date.now()}`;
    const newEvent = { ...interviewEventForm, id };
    const customInterviewEvents = [...(preferences.customInterviewEvents || []), newEvent];
    updatePreferences({ customInterviewEvents });
    dispatch({ type: 'RESET_FORMS' });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  };

  const handleEditInterviewEvent = (event: any) => {
    dispatch({ type: 'SET_FIELD', field: 'editingInterviewEvent', value: event });
    dispatch({ type: 'SET_INTERVIEW_EVENT_FORM', value: event });
  };

  const handleUpdateInterviewEvent = () => {
    const customInterviewEvents = (preferences.customInterviewEvents || []).map((e: any) =>
      e.id === editingInterviewEvent?.id ? { ...e, ...interviewEventForm } : e
    );
    updatePreferences({ customInterviewEvents });
    dispatch({ type: 'RESET_FORMS' });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  };

  const handleDeleteInterviewEvent = (eventId: string) => {
    const customInterviewEvents = (preferences.customInterviewEvents || []).filter((e: any) => e.id !== eventId);
    updatePreferences({ customInterviewEvents });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  };

  const handleReset = () => {
    resetPreferences();
    dispatch({ type: 'RESET_FORMS' });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: false });
    showSuccess(t('settings.resetDefault'));
  };

  const handleSave = () => {
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: false });
    showSuccess(t('settings.success'));
  };

  const allFieldsList = [...DEFAULT_FIELDS, ...(preferences.customFields || [])];

  const orderedFields = preferences.columnOrder
    .map((id: string) => allFieldsList.find((field) => field.id === id))
    .filter((field): field is FieldDefinition => Boolean(field));

  const categories = [
    {
      id: 'general',
      label: t('settings.categories.general'),
      sections: ['view', 'date'],
    },
    {
      id: 'customization',
      label: t('settings.categories.customization'),
      sections: ['fields', 'custom', 'interviewing'],
    },
    {
      id: 'integrations',
      label: t('settings.categories.integrations'),
      sections: ['atsSearch', 'emailScan'],
    },
    {
      id: 'account',
      label: t('settings.categories.account'),
      sections: ['cloud'],
    },
  ];

  const sections = [
    { id: 'fields' as const, label: t('settings.sections.fields'), icon: '📋', description: t('settings.sections.fieldsDesc') },
    { id: 'view' as const, label: t('settings.sections.view'), icon: '👁️', description: t('settings.sections.viewDesc') },
    { id: 'date' as const, label: t('settings.sections.date'), icon: '📅', description: t('settings.sections.dateDesc') },
    { id: 'custom' as const, label: t('settings.sections.custom'), icon: '➕', description: t('settings.sections.customDesc') },
    { id: 'interviewing' as const, label: t('settings.sections.interviewing'), icon: '🎯', description: t('settings.sections.interviewingDesc') },
    { id: 'atsSearch' as const, label: t('opportunities.atsSearch.title'), icon: '🔍', description: t('settings.sections.atsSearchDesc') },
    { id: 'emailScan' as const, label: t('settings.emailScan.section'), icon: '📧', description: t('settings.sections.emailScanDesc') },
    { id: 'cloud' as const, label: t('settings.sections.cloud'), icon: '☁️', description: t('settings.sections.cloudDesc') },
  ];

  const currentSection = sections.find(s => s.id === activeSection);

  const renderSection = () => {
    switch (activeSection) {
      case 'fields':
        return (
          <FieldsSettings
            orderedFields={orderedFields}
            enabledFields={preferences.enabledFields}
            defaultFields={DEFAULT_FIELDS}
            onToggleField={handleToggleField}
            onMoveField={handleMoveField}
          />
        );
      case 'view':
        return (
          <ViewSettings
            defaultView={preferences.defaultView}
            onDefaultViewChange={handleDefaultViewChange}
          />
        );
      case 'date':
        return (
          <DateFormatSettings
            currentFormat={preferences.dateFormat}
            onDateFormatChange={handleDateFormatChange}
          />
        );
      case 'custom':
        return (
          <CustomFieldsSettings
            customFields={preferences.customFields || []}
            editingCustomField={editingCustomField}
            customFieldForm={customFieldForm}
            setCustomFieldForm={(value) => dispatch({ type: 'SET_CUSTOM_FIELD_FORM', value })}
            onAddCustomField={handleAddCustomField}
            onEditCustomField={handleEditCustomField}
            onUpdateCustomField={handleUpdateCustomField}
            onDeleteCustomField={handleDeleteCustomField}
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
                ? current.filter(id => id !== chatbotId)
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
            onAddInterviewEvent={handleAddInterviewEvent}
            onEditInterviewEvent={handleEditInterviewEvent}
            onUpdateInterviewEvent={handleUpdateInterviewEvent}
            onDeleteInterviewEvent={handleDeleteInterviewEvent}
            onCancelEdit={() => dispatch({ type: 'RESET_FORMS' })}
          />
        );
      case 'cloud':
        return (
          <div className="space-y-8">
            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-8">
              {isAuthenticated ? (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{t('settings.categories.account')}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{user?.email}</p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-green-600 dark:text-green-400">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Synced & Secure</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      showSuccess('Logged out successfully');
                    }}
                    className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm transition-all"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-4">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sync is currently disabled</h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">Log in to keep your applications and opportunities in sync across all your devices.</p>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button
                      onClick={() => onNavigate?.('login' as any)}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => onNavigate?.('register' as any)}
                      className="px-8 py-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="mt-2 text-lg text-gray-500 dark:text-gray-400 font-medium">
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
        {/* Sidebar Navigation */}
        <aside className="py-6 lg:col-span-3">
          <nav className="space-y-10">
            {categories.map((category) => (
              <div key={category.id}>
                <h3 className="px-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4">
                  {category.label}
                </h3>
                <div className="space-y-1">
                  {category.sections.map((sectionId) => {
                    const section = sections.find((s) => s.id === sectionId);
                    if (!section) return null;
                    const isActive = activeSection === sectionId;
                    return (
                      <button
                        key={sectionId}
                        onClick={() => dispatch({ type: 'SET_FIELD', field: 'activeSection', value: sectionId })}
                        className={`group flex items-center px-4 py-3 text-sm font-bold rounded-xl w-full transition-all duration-200 ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none ring-4 ring-indigo-50 dark:ring-indigo-900/20'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <span className={`mr-3 text-xl transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}>
                          {section.icon}
                        </span>
                        <span className="truncate">{section.label}</span>
                        {isActive && (
                          <span className="ml-auto">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="lg:col-span-9 mt-8 lg:mt-0">
          {/* Header for current section */}
          <div className="bg-white dark:bg-gray-800 shadow-xl shadow-gray-100 dark:shadow-none border border-gray-100 dark:border-gray-700 rounded-2xl mb-8 overflow-hidden">
            <div className={`p-8 ${activeSection === 'atsSearch' ? 'bg-indigo-50/30 dark:bg-indigo-900/5 border-l-8 border-indigo-600' : ''}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                    {currentSection?.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                      {currentSection?.label}
                    </h2>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                      {currentSection?.description}
                    </p>
                  </div>
                </div>

                {/* Save/Reset Controls for desktop inside the header */}
                <div className="hidden sm:flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                  >
                    {t('settings.resetDefault')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!hasChanges}
                    className={`inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-bold rounded-xl shadow-lg transition-all ${
                      hasChanges
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {t('settings.saveChanges')}
                  </button>
                </div>
              </div>
              {hasChanges && (
                <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-lg w-fit">
                   <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                   <span className="text-xs text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">
                    {t('settings.unsavedChanges')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section Content Card */}
          <div className="bg-white dark:bg-gray-800 shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 rounded-[2rem] overflow-hidden min-h-[500px]">
            <div className="p-8 sm:p-12">
              {renderSection()}
            </div>
          </div>

          {/* Mobile Save/Reset Controls */}
          <div className="mt-8 sm:hidden bg-white dark:bg-gray-800 p-6 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-xl flex flex-col gap-4">
             <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges}
                className={`w-full flex justify-center py-4 px-4 rounded-2xl shadow-lg text-sm font-bold transition-all ${
                  hasChanges ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200' : 'bg-gray-200 text-gray-400'
                }`}
              >
                {t('settings.saveChanges')}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="w-full flex justify-center py-4 px-4 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                {t('settings.resetDefault')}
              </button>
          </div>
        </div>
      </div>

      <div className="mt-20 border-t border-gray-100 dark:border-gray-700 pt-10">
        <Footer version={packageJson.version} />
      </div>
    </div>
  );
};

const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  return <SettingsPageContent onNavigate={onNavigate} />;
};

export default SettingsPage;
