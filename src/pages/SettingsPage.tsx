import React, { useReducer, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSEO } from '../seo/useSEO';
import { usePreferencesStore } from '../stores/preferencesStore';
import { useAlert } from '../components/AlertProvider';
import { DEFAULT_FIELDS } from '../utils/constants';
import { type PageType } from '../App';
import { type FieldDefinition, type ViewType, type DateFormat, type CustomInterviewEvent } from '../types/preferences';
import type { UserMatchProfile } from '../types/matching';
import FieldsSettings from '../components/settings/FieldsSettings';
import ViewSettings from '../components/settings/ViewSettings';
import DateFormatSettings from '../components/settings/DateFormatSettings';
import CustomFieldsSettings from '../components/settings/CustomFieldsSettings';
import InterviewingSettings from '../components/settings/InterviewingSettings';
import EmailScanSettings from '../components/settings/EmailScanSettings';
import ATSSearchSettings from '../components/settings/ATSSearchSettings';
import ToolsSettings from '../components/settings/ToolsSettings';
import { MatchingSettings } from '../components/settings/MatchingSettings';
import { ProfileSetupModal } from '../components/ProfileSetupModal';
import { useMatchingStore } from '../stores/matchingStore';
import { useApplicationsStore } from '../stores/applicationsStore';
import { useOpportunitiesStore } from '../stores/opportunitiesStore';
import { saveMatchProfile } from '../storage/matching';
import { getCurrentISOString } from '../utils/dateHelpers';

import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import Footer from '../components/Footer';
import { SettingsSidebar, type SettingsSection } from '../components/settings/SettingsSidebar';
import { SettingsSectionHeader } from '../components/settings/SettingsSectionHeader';
import { CloudAccountSection } from '../components/settings/CloudAccountSection';
import packageJson from '../../package.json';

interface SettingsPageProps {
  onNavigate?: (page: PageType) => void;
}



interface SettingsState {
  activeSection: SettingsSection;
  hasChanges: boolean;
  editingCustomField: FieldDefinition | null;
  customFieldForm: Partial<FieldDefinition>;
  editingInterviewEvent: CustomInterviewEvent | null;
  interviewEventForm: Partial<CustomInterviewEvent>;
  isProfileModalOpen: boolean;
}

type SettingsAction =
  | { type: 'SET_FIELD'; field: keyof SettingsState; value: unknown }
  | { type: 'SET_CUSTOM_FIELD_FORM'; value: Partial<FieldDefinition> }
  | { type: 'SET_INTERVIEW_EVENT_FORM'; value: Partial<CustomInterviewEvent> }
  | { type: 'RESET_FORMS' }
  | { type: 'TOGGLE_PROFILE_MODAL'; value: boolean };

const initialState: SettingsState = {
  activeSection: 'view',
  hasChanges: false,
  editingCustomField: null,
  customFieldForm: { type: 'text' },
  editingInterviewEvent: null,
  interviewEventForm: { id: '', label: '' },
  isProfileModalOpen: false,
};

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_CUSTOM_FIELD_FORM':
      return { ...state, customFieldForm: action.value };
    case 'SET_INTERVIEW_EVENT_FORM':
      return { ...state, interviewEventForm: action.value };
    case 'TOGGLE_PROFILE_MODAL':
      return { ...state, isProfileModalOpen: action.value };
    case 'RESET_FORMS':
      return {
        ...state,
        editingCustomField: null,
        customFieldForm: { type: 'text' },
        editingInterviewEvent: null,
        interviewEventForm: { id: '', label: '' },
      };
    default:
      return state;
  }
}

const SettingsPageContent: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { preferences, updatePreferences, resetPreferences } = usePreferencesStore();

  useSEO({
    title: t('seo.settings.title'),
    description: t('seo.settings.description'),
  });
  const { showSuccess, showError } = useAlert();
  const [state, dispatch] = useReducer(settingsReducer, initialState);

  const { applications } = useApplicationsStore();
  const { opportunities } = useOpportunitiesStore();
  const {
    profile,
    preferences: matchingPreferences,
    isComputingProfile,
    isComputingScores,
    computeError,
    lastProfileCompute,
    loadMatchingState,
    updatePreferences: updateMatchingPreferences,
    buildProfile,
    computeScores,
    clearAllMatchingData,
    resetError,
  } = useMatchingStore();

  useEffect(() => {
    loadMatchingState();
  }, [loadMatchingState]);

  useEffect(() => {
    if (computeError) {
      showError(computeError);
      resetError();
    }
  }, [computeError, showError, resetError]);

  const {
    activeSection,
    hasChanges,
    editingCustomField,
    customFieldForm,
    editingInterviewEvent,
    interviewEventForm,
    isProfileModalOpen,
  } = state;

  const profileStatus: 'none' | 'building' | 'ready' =
    isComputingProfile ? 'building' : profile ? 'ready' : 'none';

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
    const newEvent: CustomInterviewEvent = { id, label: interviewEventForm.label || '' };
    const customInterviewEvents = [...(preferences.customInterviewEvents || []), newEvent];
    updatePreferences({ customInterviewEvents });
    dispatch({ type: 'RESET_FORMS' });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  };

  const handleEditInterviewEvent = (event: CustomInterviewEvent) => {
    dispatch({ type: 'SET_FIELD', field: 'editingInterviewEvent', value: event });
    dispatch({ type: 'SET_INTERVIEW_EVENT_FORM', value: event });
  };

  const handleUpdateInterviewEvent = () => {
    const customInterviewEvents = (preferences.customInterviewEvents || []).map((e: CustomInterviewEvent) =>
      e.id === editingInterviewEvent?.id ? { ...e, ...interviewEventForm } : e
    );
    updatePreferences({ customInterviewEvents });
    dispatch({ type: 'RESET_FORMS' });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  };

  const handleDeleteInterviewEvent = (eventId: string) => {
    const customInterviewEvents = (preferences.customInterviewEvents || []).filter((e: CustomInterviewEvent) => e.id !== eventId);
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
      id: 'data',
      label: t('settings.categories.data'),
      sections: ['fields', 'custom', 'interviewing', 'tools'],
    },
    {
      id: 'sync',
      label: t('settings.categories.sync'),
      sections: ['emailScan'],
    },
    {
      id: 'tools',
      label: t('settings.categories.tools'),
      sections: ['atsSearch', 'matching'],
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
    { id: 'tools' as const, label: t('settings.sections.tools'), icon: '🛠️', description: t('settings.sections.toolsDesc') },
    { id: 'cloud' as const, label: t('settings.sections.cloud'), icon: '☁️', description: t('settings.sections.cloudDesc') },
    { id: 'matching' as const, label: 'AI Matching', icon: '🧠', description: 'Configure AI-powered job matching and manage your career profile' },
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
      case 'tools':
        return <ToolsSettings />;
      case 'matching':
        return (
          <MatchingSettings
            preferences={matchingPreferences}
            profileStatus={profileStatus}
            profileLastComputed={lastProfileCompute}
            isComputingScores={isComputingScores}
            onUpdatePreferences={updateMatchingPreferences}
            onBuildProfile={() => buildProfile(applications)}
            onComputeScores={() => computeScores(opportunities, applications)}
            onOpenProfileModal={() => dispatch({ type: 'TOGGLE_PROFILE_MODAL', value: true })}
            onClearData={clearAllMatchingData}
          />
        );
      case 'cloud':
        return <CloudAccountSection onNavigate={onNavigate} />;
      default:
        return null;
    }
  };

  return (
    <div className='max-w-6xl mx-auto px-6 lg:px-8 py-8'>
      {/* Page header - editorial style */}
      <PageHeader
        category="Configuration"
        title={t('settings.title')}
        description={t('settings.subtitle')}
        className="mb-12"
      />

      <div className='lg:grid lg:grid-cols-12 lg:gap-x-12'>
        <SettingsSidebar
          categories={categories}
          sections={sections}
          activeSection={activeSection}
          onSelectSection={(sectionId) => dispatch({ type: 'SET_FIELD', field: 'activeSection', value: sectionId })}
        />

        {/* Main Content Area */}
        <div className='lg:col-span-9 mt-8 lg:mt-0'>
          {currentSection && (
            <SettingsSectionHeader
              section={currentSection}
              hasChanges={hasChanges}
              onSave={handleSave}
              onReset={handleReset}
            />
          )}

          {/* Section Content Card */}
          <Card className='overflow-hidden min-h-[500px]'>
            <div className='p-8 sm:p-12'>
              {/* react-doctor-disable-next-line no-render-in-render -- centralized section router; inlining requires prop-drilling ~25 state/handler values */}
              {renderSection()}
            </div>
          </Card>

          {/* Mobile Save/Reset Controls */}
          <Card className='mt-8 sm:hidden flex flex-col gap-4'>
             <button
                type='button'
                onClick={handleSave}
                disabled={!hasChanges}
                className={`w-full flex justify-center py-4 px-4 text-sm font-semibold transition-colors ${
                  hasChanges ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground'
                }`}
              >
                {t('settings.saveChanges')}
              </button>
              <button
                type='button'
                onClick={handleReset}
                className='w-full flex justify-center p-4 text-sm font-semibold text-muted-foreground bg-card hover:bg-muted transition-colors'
              >
                {t('settings.resetDefault')}
              </button>
          </Card>
        </div>
      </div>

      <div className='mt-20 border-t border-border pt-10'>
        <Footer version={packageJson.version} />
      </div>

      {/* Profile Setup Modal — key ensures clean remount when opening/closing */}
      <ProfileSetupModal
        key={`profile-modal-${isProfileModalOpen ? (profile ? 'edit' : 'new') : 'closed'}`}
        isOpen={isProfileModalOpen}
        onClose={() => dispatch({ type: 'TOGGLE_PROFILE_MODAL', value: false })}
        existingProfile={profile}
        onSave={(updatedProfile) => {
          const merged: UserMatchProfile = {
            targetRoles: updatedProfile.targetRoles ?? profile?.targetRoles ?? [],
            seniority: updatedProfile.seniority !== undefined ? updatedProfile.seniority : (profile?.seniority ?? null),
            topSkills: updatedProfile.topSkills ?? profile?.topSkills ?? [],
            preferredWorkTypes: updatedProfile.preferredWorkTypes ?? profile?.preferredWorkTypes ?? [],
            preferredLocations: updatedProfile.preferredLocations ?? profile?.preferredLocations ?? [],
            salaryRange: updatedProfile.salaryRange !== undefined ? updatedProfile.salaryRange : (profile?.salaryRange ?? null),
            preferredIndustries: profile?.preferredIndustries ?? [],
            explicitRoles: profile?.explicitRoles,
            explicitSkills: updatedProfile.explicitSkills ?? profile?.explicitSkills,
            cvText: updatedProfile.cvText,
            profileSummary: profile?.profileSummary ?? '',
            successPatterns: profile?.successPatterns ?? [],
            avoidPatterns: profile?.avoidPatterns ?? [],
            profileVersion: (profile?.profileVersion ?? 0) + 1,
            confidence: profile?.confidence ?? 'medium',
            lastComputed: getCurrentISOString(),
          };
          saveMatchProfile(merged);
          loadMatchingState();
          showSuccess('Matching profile saved!');
        }}
      />
    </div>
  );
};

const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  return <SettingsPageContent onNavigate={onNavigate} />;
};

export default SettingsPage;