import { useCallback, useReducer } from 'react';
import { useTranslation } from 'react-i18next';

import { useEmailScan } from '../mails/hooks/useEmailScan';
import { GmailEmailClient } from '../mails/providers/gmail/gmailClient';
import { getAuthCookie } from '../utils/api';
import { useAlert } from './AlertProvider';
import { useApplicationsStore } from '../stores/applicationsStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import EmailScanTabs from './email-scan/EmailScanTabs';
import EmailScanControls from './email-scan/EmailScanControls';
import EmailScanManualTab from './email-scan/EmailScanManualTab';
import EmailScanResults from './email-scan/EmailScanResults';
import EmailScanHeader from './email-scan/EmailScanHeader';
import EmailScanError from './email-scan/EmailScanError';
import { emailScanReducer } from './email-scan/reducer';
import { useEmailScanManualLogic } from './email-scan/useEmailScanManualLogic';

export function EmailScanReview() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useAlert();
  const applications = useApplicationsStore((state) => state.applications);
  const preferences = usePreferencesStore((state) => state.preferences);

  const {
    scan,
    applySelected,
    loading,
    applying,
    error,
    preview,
    setPreview,
    clearPreview,
  } = useEmailScan();

  const [state, dispatch] = useReducer(emailScanReducer, {
    activeTab: 'automatic',
    selectedAdditions: new Set<string>(),
    selectedUpdates: new Set<string>(),
    scanMonths: preferences.emailScanMonths || 3,
    snippetLength: 200,
    selectedEmailIds: new Set<string>(),
    pastedJson: '',
    forceAddIds: new Set<string>(),
  });

  const {
    activeTab,
    selectedAdditions,
    selectedUpdates,
    scanMonths,
    snippetLength,
    selectedEmailIds,
    pastedJson,
    forceAddIds,
  } = state;

  const { handleProcessJson } = useEmailScanManualLogic({ pastedJson, setPreview, dispatch });

  const handleScanGmail = useCallback(async () => {
    try {
      const res = await getAuthCookie();
      if (!res.success || !res.access_token) {
        showError(t('settings.emailScan.signInRequired'));
        return;
      }
      const provider = new GmailEmailClient(res.access_token);
      const daysBack = scanMonths * 30;
      const result = await scan(provider, daysBack);
      dispatch({ type: 'CLEAR_SELECTIONS' });
      if (result) {
        dispatch({ type: 'SELECT_ALL_EMAILS', payload: result.emails.map(e => e.id) });
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : t('settings.emailScan.scanError'));
    }
  }, [scan, showError, t, scanMonths]);

  const toggleAddition = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_ADDITION', payload: id });
  }, []);

  const toggleUpdate = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_UPDATE', payload: id });
  }, []);

  const selectAllAdditions = useCallback(() => {
    if (!preview) return;
    dispatch({ type: 'SELECT_ALL_ADDITIONS', payload: preview.proposedAdditions.map((a) => a.id) });
  }, [preview]);

  const selectAllUpdates = useCallback(() => {
    if (!preview) return;
    dispatch({ type: 'SELECT_ALL_UPDATES', payload: preview.proposedUpdates.map((u) => u.id) });
  }, [preview]);

  const handleApplySelected = useCallback(async () => {
    if (!preview) return;

    const additions = preview.proposedAdditions.filter((a) =>
      selectedAdditions.has(a.id)
    );
    const updates = preview.proposedUpdates.filter((u) =>
      selectedUpdates.has(u.id)
    );

    if (additions.length === 0 && updates.length === 0) {
      showError(t('settings.emailScan.selectAtLeastOne'));
      return;
    }

    try {
      const result = await applySelected(additions, updates);
      showSuccess(
        t('settings.emailScan.applySuccess', {
          added: result.added,
          updated: result.updated,
        })
      );
      dispatch({
        type: 'APPLIED_CHANGES',
        payload: {
          additions: additions.map((a) => a.id),
          updates: updates.map((u) => u.id),
        },
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : t('settings.emailScan.applyError'));
    }
  }, [
    preview,
    selectedAdditions,
    selectedUpdates,
    applySelected,
    showSuccess,
    showError,
    t,
  ]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        dateStyle: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const isDuplicate = useCallback((company: string, position: string) => {
    return applications.some(app =>
      app.company.toLowerCase().trim() === company.toLowerCase().trim() &&
      app.position.toLowerCase().trim() === position.toLowerCase().trim() &&
      app.status !== 'Deleted'
    );
  }, [applications]);

  const handleGeneratePrompt = useCallback((chatbot?: { id: string; name: string; url: string }) => {
    if (!preview) return;
    const selectedEmails = preview.emails.filter(e => selectedEmailIds.has(e.id));

    const emailsData = selectedEmails.map(e => ({
      subject: e.subject,
      from: e.from,
      date: e.date,
      snippet: e.body.substring(0, snippetLength)
    }));

    const prompt = t('settings.emailScan.promptTemplate', {
      emails: JSON.stringify(emailsData, null, 2)
    });

    navigator.clipboard.writeText(prompt);

    if (chatbot) {
      showSuccess(t('settings.emailScan.promptCopiedToOpen', { name: chatbot.name }));
      window.open(chatbot.url, '_blank');
    } else {
      showSuccess(t('settings.emailScan.promptCopied'));
    }
  }, [preview, selectedEmailIds, snippetLength, showSuccess, t]);

  const toggleEmailSelection = (id: string) => {
    dispatch({ type: 'TOGGLE_EMAIL', payload: id });
  };

  const selectAllEmails = () => {
    if (!preview) return;
    dispatch({ type: 'SELECT_ALL_EMAILS', payload: preview.emails.map(e => e.id) });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <EmailScanHeader />

        <EmailScanTabs
          activeTab={activeTab}
          onTabChange={(tab) => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab })}
        />

        <EmailScanError error={error} />

        <EmailScanControls
          scanMonths={scanMonths}
          loading={loading}
          applying={applying}
          hasPreview={!!preview}
          selectedCount={selectedAdditions.size + selectedUpdates.size}
          onScanMonthsChange={(months) => dispatch({ type: 'SET_SCAN_MONTHS', payload: months })}
          onScan={handleScanGmail}
          onClearPreview={clearPreview}
          onApply={handleApplySelected}
        />

        {activeTab === 'manual' && (
          <EmailScanManualTab
            snippetLength={snippetLength}
            selectedEmailIds={selectedEmailIds}
            pastedJson={pastedJson}
            enabledChatbots={preferences.enabledChatbots || ['ChatGPT', 'Claude', 'Gemini']}
            emails={preview?.emails || []}
            onSnippetLengthChange={(len) => dispatch({ type: 'SET_SNIPPET_LENGTH', payload: len })}
            onGeneratePrompt={handleGeneratePrompt}
            onSelectAllEmails={selectAllEmails}
            onToggleEmail={toggleEmailSelection}
            onPastedJsonChange={(json) => dispatch({ type: 'SET_PASTED_JSON', payload: json })}
            onProcessJson={handleProcessJson}
            formatDate={formatDate}
          />
        )}

        {preview && (
          <EmailScanResults
            proposedAdditions={preview.proposedAdditions}
            proposedUpdates={preview.proposedUpdates}
            selectedAdditions={selectedAdditions}
            selectedUpdates={selectedUpdates}
            forceAddIds={forceAddIds}
            isDuplicate={isDuplicate}
            onToggleAddition={toggleAddition}
            onToggleUpdate={toggleUpdate}
            onSelectAllAdditions={selectAllAdditions}
            onSelectAllUpdates={selectAllUpdates}
            onToggleForceAdd={(id) => dispatch({ type: 'TOGGLE_FORCE_ADD', payload: id })}
            formatDate={formatDate}
          />
        )}
      </div>
    </div>
  );
}
