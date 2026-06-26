import React, { useReducer, useEffect, useMemo, useCallback } from 'react';
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

const useSettingsManager = () => {
  const { t } = useTranslation();
  const { preferences, updatePreferences, resetPreferences } = usePreferencesStore();
  const { showSuccess, showError } = useAlert();
  const [state, dispatch] = useReducer(settingsReducer, initialState);

  const { applications } = useApplicationsStore();
  const { opportunities } = useOpportunitiesStore();
  const {
    profile: matchingProfile,
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

  const profileStatus: 'none' | 'building' | 'ready' = isComputingProfile ? 'building' : matchingProfile ? 'ready' : 'none';

  const handleToggleField = useCallback(
    (fieldId: string) => {
      const enabledFields = preferences.enabledFields.includes(fieldId)
        ? preferences.enabledFields.filter((id: string) => id !== fieldId)
        : [...preferences.enabledFields, fieldId];
      updatePreferences({ enabledFields });
      dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
    },
    [preferences.enabledFields, updatePreferences]
  );

  const handleMoveField = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const newOrder = [...preferences.columnOrder];
      const dragField = newOrder[dragIndex];
      newOrder.splice(dragIndex, 1);
      newOrder.splice(hoverIndex, 0, dragField);
      updatePreferences({ columnOrder: newOrder });
      dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
    },
    [preferences.columnOrder, updatePreferences]
  );

  const handleDefaultViewChange = useCallback(
    (view: ViewType) => {
      updatePreferences({ defaultView: view });
      dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
    },
    [updatePreferences]
  );

  const handleDateFormatChange = useCallback(
    (format: DateFormat) => {
      updatePreferences({ dateFormat: format });
      dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
    },
    [updatePreferences]
  );

  const handleAddCustomField = useCallback(() => {
    const id = `custom_${Date.now()}`;
    const newField = { ...state.customFieldForm, id } as FieldDefinition;
    const customFields = [...(preferences.customFields || []), newField];
    const enabledFields = [...preferences.enabledFields, id];
    const columnOrder = [...preferences.columnOrder, id];
    updatePreferences({ customFields, enabledFields, columnOrder });
    dispatch({ type: 'RESET_FORMS' });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  }, [state.customFieldForm, preferences.customFields, preferences.enabledFields, preferences.columnOrder, updatePreferences]);

  const handleEditCustomField = useCallback((field: FieldDefinition) => {
    dispatch({ type: 'SET_FIELD', field: 'editingCustomField', value: field });
    dispatch({ type: 'SET_CUSTOM_FIELD_FORM', value: field });
  }, []);

  const handleUpdateCustomField = useCallback(() => {
    const customFields = (preferences.customFields || []).map((f: FieldDefinition) =>
      f.id === state.editingCustomField?.id ? { ...f, ...state.customFieldForm } : f
    );
    updatePreferences({ customFields });
    dispatch({ type: 'RESET_FORMS' });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  }, [state.editingCustomField, state.customFieldForm, preferences.customFields, updatePreferences]);

  const handleDeleteCustomField = useCallback(
    (fieldId: string) => {
      const customFields = (preferences.customFields || []).filter((f: FieldDefinition) => f.id !== fieldId);
      const enabledFields = preferences.enabledFields.filter((id: string) => id !== fieldId);
      const columnOrder = preferences.columnOrder.filter((id: string) => id !== fieldId);
      updatePreferences({ customFields, enabledFields, columnOrder });
      dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
    },
    [preferences.customFields, preferences.enabledFields, preferences.columnOrder, updatePreferences]
  );

  const handleAddInterviewEvent = useCallback(() => {
    const id = `event_${Date.now()}`;
    const newEvent: CustomInterviewEvent = { id, label: state.interviewEventForm.label || '' };
    const customInterviewEvents = [...(preferences.customInterviewEvents || []), newEvent];
    updatePreferences({ customInterviewEvents });
    dispatch({ type: 'RESET_FORMS' });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  }, [state.interviewEventForm.label, preferences.customInterviewEvents, updatePreferences]);

  const handleEditInterviewEvent = useCallback((event: CustomInterviewEvent) => {
    dispatch({ type: 'SET_FIELD', field: 'editingInterviewEvent', value: event });
    dispatch({ type: 'SET_INTERVIEW_EVENT_FORM', value: event });
  }, []);

  const handleUpdateInterviewEvent = useCallback(() => {
    const customInterviewEvents = (preferences.customInterviewEvents || []).map((e: CustomInterviewEvent) =>
      e.id === state.editingInterviewEvent?.id ? { ...e, ...state.interviewEventForm } : e
    );
    updatePreferences({ customInterviewEvents });
    dispatch({ type: 'RESET_FORMS' });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
  }, [state.editingInterviewEvent, state.interviewEventForm, preferences.customInterviewEvents, updatePreferences]);

  const handleDeleteInterviewEvent = useCallback(
    (eventId: string) => {
      const customInterviewEvents = (preferences.customInterviewEvents || []).filter((e: CustomInterviewEvent) => e.id !== eventId);
      updatePreferences({ customInterviewEvents });
      dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
    },
    [preferences.customInterviewEvents, updatePreferences]
  );

  const handleEmailScanMonthsChange = useCallback(
    (months: number) => {
      updatePreferences({ emailScanMonths: months });
      dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
    },
    [updatePreferences]
  );

  const handleChatbotToggle = useCallback(
    (chatbotId: string) => {
      const current = preferences.enabledChatbots || ['ChatGPT', 'Claude', 'Gemini'];
      const enabledChatbots = current.includes(chatbotId)
        ? current.filter((id: string) => id !== chatbotId)
        : [...current, chatbotId];
      updatePreferences({ enabledChatbots });
      dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
    },
    [preferences.enabledChatbots, updatePreferences]
  );

  const handleAtsSearchChange = useCallback(
    (key: string, value: unknown) => {
      updatePreferences({
        atsSearch: { ...preferences.atsSearch!, [key]: value },
      });
      dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: true });
    },
    [preferences.atsSearch, updatePreferences]
  );

  const handleReset = useCallback(() => {
    resetPreferences();
    dispatch({ type: 'RESET_FORMS' });
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: false });
    showSuccess(t('settings.resetDefault'));
  }, [resetPreferences, showSuccess, t]);

  const handleSave = useCallback(() => {
    dispatch({ type: 'SET_FIELD', field: 'hasChanges', value: false });
    showSuccess(t('settings.success'));
  }, [showSuccess, t]);

  const handleSelectSection = useCallback((sectionId: SettingsSection) => {
    dispatch({ type: 'SET_FIELD', field: 'activeSection', value: sectionId });
  }, []);

  const handleOpenProfileModal = useCallback(() => {
    dispatch({ type: 'TOGGLE_PROFILE_MODAL', value: true });
  }, []);

  const handleCloseProfileModal = useCallback(() => {
    dispatch({ type: 'TOGGLE_PROFILE_MODAL', value: false });
  }, []);

  const orderedFields = useMemo(() => {
    const allFieldsList = [...DEFAULT_FIELDS, ...(preferences.customFields || [])];
    return preferences.columnOrder
      .map((id: string) => allFieldsList.find((field) => field.id === id))
      .filter((field): field is FieldDefinition => Boolean(field));
  }, [preferences.customFields, preferences.columnOrder]);

  const categories = useMemo(
    () => [
      { id: 'general', label: t('settings.categories.general'), sections: ['view', 'date'] },
      { id: 'data', label: t('settings.categories.data'), sections: ['fields', 'custom', 'interviewing', 'tools'] },
      { id: 'sync', label: t('settings.categories.sync'), sections: ['emailScan'] },
      { id: 'tools', label: t('settings.categories.tools'), sections: ['atsSearch', 'matching'] },
      { id: 'account', label: t('settings.categories.account'), sections: ['cloud'] },
    ],
    [t]
  );

  const sections = useMemo(
    () => [
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
    ],
    [t]
  );

  const currentSection = useMemo(
    () => sections.find((s) => s.id === state.activeSection),
    [sections, state.activeSection]
  );

  const buildProfileForApplications = useCallback(() => buildProfile(applications), [buildProfile, applications]);
  const computeScoresForData = useCallback(
    () => computeScores(opportunities, applications),
    [computeScores, opportunities, applications]
  );

  const setCustomFieldForm = useCallback(
    (value: Partial<FieldDefinition>) => dispatch({ type: 'SET_CUSTOM_FIELD_FORM', value }),
    []
  );

  const setInterviewEventForm = useCallback(
    (value: Partial<CustomInterviewEvent>) => dispatch({ type: 'SET_INTERVIEW_EVENT_FORM', value }),
    []
  );

  const cancelEdit = useCallback(() => dispatch({ type: 'RESET_FORMS' }), []);

  return {
    state,
    handlers: {
      handleToggleField,
      handleMoveField,
      handleDefaultViewChange,
      handleDateFormatChange,
      handleAddCustomField,
      handleEditCustomField,
      handleUpdateCustomField,
      handleDeleteCustomField,
      handleAddInterviewEvent,
      handleEditInterviewEvent,
      handleUpdateInterviewEvent,
      handleDeleteInterviewEvent,
      handleEmailScanMonthsChange,
      handleChatbotToggle,
      handleAtsSearchChange,
      handleReset,
      handleSave,
      handleSelectSection,
      handleOpenProfileModal,
      handleCloseProfileModal,
      setCustomFieldForm,
      setInterviewEventForm,
      cancelEdit,
    },
    data: {
      preferences,
      orderedFields,
      categories,
      sections,
      currentSection,
    },
    profile: {
      matchingProfile,
      matchingPreferences,
      profileStatus,
      lastProfileCompute,
      isComputingScores,
      updateMatchingPreferences,
      buildProfile: buildProfileForApplications,
      computeScores: computeScoresForData,
      clearAllMatchingData,
      loadMatchingState,
    },
  };
};

const SettingsPageContent: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { showSuccess } = useAlert();
  const manager = useSettingsManager();

  useSEO({
    title: t('seo.settings.title'),
    description: t('seo.settings.description'),
  });

  const { state, handlers, data, profile } = manager;

  const handleProfileSave = (updatedProfile: Partial<UserMatchProfile>) => {
    const merged: UserMatchProfile = {
      targetRoles: updatedProfile.targetRoles ?? profile.matchingProfile?.targetRoles ?? [],
      seniority: updatedProfile.seniority !== undefined ? updatedProfile.seniority : (profile.matchingProfile?.seniority ?? null),
      topSkills: updatedProfile.topSkills ?? profile.matchingProfile?.topSkills ?? [],
      preferredWorkTypes: updatedProfile.preferredWorkTypes ?? profile.matchingProfile?.preferredWorkTypes ?? [],
      preferredLocations: updatedProfile.preferredLocations ?? profile.matchingProfile?.preferredLocations ?? [],
      salaryRange: updatedProfile.salaryRange !== undefined ? updatedProfile.salaryRange : (profile.matchingProfile?.salaryRange ?? null),
      preferredIndustries: profile.matchingProfile?.preferredIndustries ?? [],
      explicitRoles: profile.matchingProfile?.explicitRoles,
      explicitSkills: updatedProfile.explicitSkills ?? profile.matchingProfile?.explicitSkills,
      cvText: updatedProfile.cvText,
      profileSummary: profile.matchingProfile?.profileSummary ?? '',
      successPatterns: profile.matchingProfile?.successPatterns ?? [],
      avoidPatterns: profile.matchingProfile?.avoidPatterns ?? [],
      profileVersion: (profile.matchingProfile?.profileVersion ?? 0) + 1,
      confidence: profile.matchingProfile?.confidence ?? 'medium',
      lastComputed: getCurrentISOString(),
    };
    saveMatchProfile(merged);
    profile.loadMatchingState();
    showSuccess('Matching profile saved!');
  };

  return (
    <div className='max-w-6xl mx-auto px-6 lg:px-8 py-8'>
      <PageHeader
        category="Configuration"
        title={t('settings.title')}
        description={t('settings.subtitle')}
        className="mb-12"
      />

      <div className='lg:grid lg:grid-cols-12 lg:gap-x-12'>
        <SettingsSidebar
          categories={data.categories}
          sections={data.sections}
          activeSection={state.activeSection}
          onSelectSection={handlers.handleSelectSection}
        />

        <div className='lg:col-span-9 mt-8 lg:mt-0'>
          {data.currentSection && (
            <SettingsSectionHeader
              section={data.currentSection}
              hasChanges={state.hasChanges}
              onSave={handlers.handleSave}
              onReset={handlers.handleReset}
            />
          )}

          <Card className='overflow-hidden min-h-[500px]'>
            <div className='p-8 sm:p-12'>
              {state.activeSection === 'fields' && (
                <FieldsSettings
                  orderedFields={data.orderedFields}
                  enabledFields={data.preferences.enabledFields}
                  defaultFields={DEFAULT_FIELDS}
                  onToggleField={handlers.handleToggleField}
                  onMoveField={handlers.handleMoveField}
                />
              )}
              {state.activeSection === 'view' && (
                <ViewSettings
                  defaultView={data.preferences.defaultView}
                  onDefaultViewChange={handlers.handleDefaultViewChange}
                />
              )}
              {state.activeSection === 'date' && (
                <DateFormatSettings
                  currentFormat={data.preferences.dateFormat}
                  onDateFormatChange={handlers.handleDateFormatChange}
                />
              )}
              {state.activeSection === 'custom' && (
                <CustomFieldsSettings
                  customFields={data.preferences.customFields || []}
                  editingCustomField={state.editingCustomField}
                  customFieldForm={state.customFieldForm}
                  setCustomFieldForm={(value) => handlers.setCustomFieldForm(value)}
                  onAddCustomField={handlers.handleAddCustomField}
                  onEditCustomField={handlers.handleEditCustomField}
                  onUpdateCustomField={handlers.handleUpdateCustomField}
                  onDeleteCustomField={handlers.handleDeleteCustomField}
                  onCancelEdit={handlers.cancelEdit}
                />
              )}
              {state.activeSection === 'emailScan' && (
                <EmailScanSettings
                  emailScanMonths={data.preferences.emailScanMonths || 3}
                  enabledChatbots={data.preferences.enabledChatbots || ['ChatGPT', 'Claude', 'Gemini']}
                  onEmailScanMonthsChange={handlers.handleEmailScanMonthsChange}
                  onChatbotToggle={handlers.handleChatbotToggle}
                />
              )}
              {state.activeSection === 'atsSearch' && (
                <ATSSearchSettings
                  atsSearch={data.preferences.atsSearch}
                  onAtsSearchChange={handlers.handleAtsSearchChange}
                />
              )}
              {state.activeSection === 'interviewing' && (
                <InterviewingSettings
                  customInterviewEvents={data.preferences.customInterviewEvents || []}
                  editingInterviewEvent={state.editingInterviewEvent}
                  interviewEventForm={state.interviewEventForm}
                  setInterviewEventForm={(value) => handlers.setInterviewEventForm(value)}
                  onAddInterviewEvent={handlers.handleAddInterviewEvent}
                  onEditInterviewEvent={handlers.handleEditInterviewEvent}
                  onUpdateInterviewEvent={handlers.handleUpdateInterviewEvent}
                  onDeleteInterviewEvent={handlers.handleDeleteInterviewEvent}
                  onCancelEdit={handlers.cancelEdit}
                />
              )}
              {state.activeSection === 'tools' && <ToolsSettings />}
              {state.activeSection === 'matching' && (
                <MatchingSettings
                  preferences={profile.matchingPreferences}
                  profileStatus={profile.profileStatus}
                  profileLastComputed={profile.lastProfileCompute}
                  isComputingScores={profile.isComputingScores}
                  onUpdatePreferences={profile.updateMatchingPreferences}
                  onBuildProfile={profile.buildProfile}
                  onComputeScores={profile.computeScores}
                  onOpenProfileModal={handlers.handleOpenProfileModal}
                  onClearData={profile.clearAllMatchingData}
                />
              )}
              {state.activeSection === 'cloud' && (
                <CloudAccountSection onNavigate={onNavigate} />
              )}
            </div>
          </Card>

          <Card className='mt-8 sm:hidden flex flex-col gap-4'>
            <button
              type='button'
              onClick={handlers.handleSave}
              disabled={!state.hasChanges}
              className={`w-full flex justify-center py-4 px-4 text-sm font-semibold transition-colors ${
                state.hasChanges ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground'
              }`}
            >
              {t('settings.saveChanges')}
            </button>
            <button
              type='button'
              onClick={handlers.handleReset}
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

      <ProfileSetupModal
        key={`profile-modal-${state.isProfileModalOpen ? (profile.matchingProfile ? 'edit' : 'new') : 'closed'}`}
        isOpen={state.isProfileModalOpen}
        onClose={handlers.handleCloseProfileModal}
        existingProfile={profile.matchingProfile}
        onSave={handleProfileSave}
      />
    </div>
  );
};

const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  return <SettingsPageContent onNavigate={onNavigate} />;
};

export default SettingsPage;
