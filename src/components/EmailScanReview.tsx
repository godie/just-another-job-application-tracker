import { useReducer, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useSelection } from '../hooks/useSelection';
import { useEmailScan } from '../mails/hooks/useEmailScan';
import { isGmailRateLimitError } from '../mails/errors';
import { GmailEmailClient } from '../mails/providers/gmail/gmailClient';
import { getAuthCookie } from '../utils/api';
import { useAlert } from './AlertProvider';
import { useApplicationsStore } from '../stores/applicationsStore';
import { useAuthStore } from '../stores/authStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { useGeminiKeyStore } from '../store/geminiKeyStore';
import { processManualScanJson } from '../utils/manualScan';
import { callGeminiApi } from '../utils/geminiApi';
import { GeminiKeyModal } from './GeminiKeyModal';
import { useFormatDate } from '../hooks/useFormatDate';
import { useGoogleToken } from '../hooks/useGoogleToken';
import { ScanAuthGate, type ScanAuthStatus } from './ScanAuthGate';
import { ScanResults } from './ScanResults';
import { ManualProcessingPanel } from './ManualProcessingPanel';

import { emailScanReviewReducer } from './emailScanReducer';

type ActiveTab = 'automatic' | 'manual';

// --- Sub-components (kept co-located: strictly private to this panel) ---

const EmailScanHeader: React.FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        {t('settings.emailScan.title')}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        {t('settings.emailScan.subtitle')}
      </p>
    </>
  );
};

const EmailScanTabs: React.FC<{
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();
  return (
    <div className="flex border-b border-border mb-6">
      <button
        className={`px-4 py-2 font-medium text-sm transition-colors ${
          activeTab === 'automatic'
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground dark:text-muted-foreground'
        }`}
        onClick={() => onTabChange('automatic')}
        type="button"
      >
        {t('settings.emailScan.tabs.automatic')}
      </button>
      <button
        className={`px-4 py-2 font-medium text-sm transition-colors ${
          activeTab === 'manual'
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground dark:text-muted-foreground'
        }`}
        onClick={() => onTabChange('manual')}
        type="button"
      >
        {t('settings.emailScan.tabs.manual')}
      </button>
    </div>
  );
};

const EmailScanErrorBanner: React.FC<{ error: Error | null }> = ({ error }) => {
  const { t } = useTranslation();
  if (!error) return null;
  const message = isGmailRateLimitError(error)
    ? t('settings.emailScan.rateLimitError')
    : error.message;
  return (
    <div
      className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm"
      role="alert"
    >
      {message}
    </div>
  );
};

interface EmailScanControlsProps {
  scanMonths: number;
  onScanMonthsChange: (months: number) => void;
  onScan: () => void;
  loading: boolean;
  hasPreview: boolean;
  onClearPreview: () => void;
  onApply: () => void;
  applying: boolean;
  selectionCount: number;
}

const EmailScanControls: React.FC<EmailScanControlsProps> = ({
  scanMonths,
  onScanMonthsChange,
  onScan,
  loading,
  hasPreview,
  onClearPreview,
  onApply,
  applying,
  selectionCount,
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t('settings.emailScan.scanPeriod')}
        </label>
        <select
          value={scanMonths}
          onChange={(e) => onScanMonthsChange(parseInt(e.target.value))}
          disabled={loading}
          aria-label={t('settings.emailScan.scanPeriod')}
          className='px-3 py-2 rounded border-border bg-card text-sm font-medium focus:ring-2 focus:ring-ring outline-none disabled:opacity-50 transition-all'
        >
          <option value={3}>{t('settings.emailScan.months', { count: 3 })}</option>
          <option value={6}>{t('settings.emailScan.months', { count: 6 })}</option>
          <option value={9}>{t('settings.emailScan.months', { count: 9 })}</option>
          <option value={12}>{t('settings.emailScan.months', { count: 12 })}</option>
        </select>
      </div>

      <button
        type="button"
        onClick={onScan}
        disabled={loading}
        className='px-4 py-2 rounded font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition h-[38px] flex items-center gap-2'
      >
        {loading ? (
          <>
            <svg className="animate-spin size-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t('settings.emailScan.scanning')}
          </>
        ) : (
          t('settings.emailScan.scanGmail')
        )}
      </button>
      {hasPreview && (
        <>
          <button
            type="button"
            onClick={onClearPreview}
            className='px-4 py-2 rounded font-medium border border-border text-foreground hover:bg-muted transition'
          >
            {t('settings.emailScan.clearPreview')}
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={applying || selectionCount === 0}
            className='px-4 py-2 rounded font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition'
          >
            {applying
              ? t('settings.emailScan.applying')
              : t('settings.emailScan.applySelected', { count: selectionCount })}
          </button>
        </>
      )}
    </div>
  );
};

export function EmailScanReview() {
  const { t } = useTranslation();
  const { formatShortDate } = useFormatDate();
  const { showSuccess, showError } = useAlert();
  const { hasValidToken, isChecking, checkToken } = useGoogleToken();
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

  const [state, dispatch] = useReducer(emailScanReviewReducer, {
    activeTab: 'automatic',
    processingMode: 'manual',
    showGeminiModal: false,
    geminiProcessing: false,
    scanMonths: preferences.emailScanMonths || 3,
    snippetLength: 200,
    pastedJson: '',
  });

  const { activeTab, processingMode, showGeminiModal, geminiProcessing, scanMonths, snippetLength, pastedJson } = state;
  const selectedAdditions = useSelection<string>();
  const selectedUpdates = useSelection<string>();
  const selectedEmailIds = useSelection<string>();
  const forceAddIds = useSelection<string>();

  const handleScanGmail = useCallback(async () => {
    try {
      const res = await getAuthCookie();
      if (!res.success || !res.access_token) {
        checkToken();
        showError(t('settings.emailScan.googleTokenExpired'));
        return;
      }
      const provider = new GmailEmailClient(res.access_token);
      const daysBack = scanMonths * 30;
      const result = await scan(provider, daysBack);
      selectedAdditions.clear();
      selectedUpdates.clear();
      if (result) {
        selectedEmailIds.selectAll(result.emails.map(e => e.id));
      }
    } catch (err) {
      const message = isGmailRateLimitError(err)
        ? t('settings.emailScan.rateLimitError')
        : (err instanceof Error ? err.message : t('settings.emailScan.scanError'));
      showError(message);
    }
  }, [scan, scanMonths, showError, t, selectedAdditions, selectedUpdates, selectedEmailIds, checkToken]);

  const handleApplySelected = useCallback(async () => {
    if (!preview) return;

    const additions = preview.proposedAdditions.filter((a) =>
      selectedAdditions.isSelected(a.id)
    );
    const updates = preview.proposedUpdates.filter((u) =>
      selectedUpdates.isSelected(u.id)
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
      selectedAdditions.removeMultiple(additions.map((a) => a.id));
      selectedUpdates.removeMultiple(updates.map((u) => u.id));
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

  const handleGeneratePrompt = useCallback((chatbot?: { id: string; name: string; url: string }) => {
    if (!preview) return;
    const selectedEmails = preview.emails.filter(e => selectedEmailIds.isSelected(e.id));

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

  const handleProcessJson = useCallback(() => {
    try {
      const { additions, updates } = processManualScanJson(pastedJson, applications);

      setPreview(prev => ({
        proposedAdditions: [...(prev?.proposedAdditions || []), ...additions],
        proposedUpdates: [...(prev?.proposedUpdates || []), ...updates],
        emails: prev?.emails || []
      }));

      selectedAdditions.selectAll(additions.map(a => a.id));
      selectedUpdates.selectAll(updates.map(u => u.id));
      dispatch({ type: 'SET_PASTED_JSON', value: '' });
      showSuccess('JSON procesado correctamente');
    } catch {
      showError(t('settings.emailScan.invalidJson'));
    }
  }, [pastedJson, applications, setPreview, showSuccess, showError, t, selectedAdditions, selectedUpdates]);

  const geminiKeyInMemory = useGeminiKeyStore((state) => state.geminiKeyInMemory);
  const setDecryptedKey = useGeminiKeyStore((state) => state.setDecryptedKey);
  const currentUser = useAuthStore((state) => state.currentUser);
  const hasGoogleLinked = !!(currentUser?.googleId);

  const scanAuthStatus: ScanAuthStatus = isChecking ? 'checking'
    : !hasGoogleLinked ? 'unlinked'
    : !hasValidToken ? 'expired'
    : 'ready';

  const handleProcessWithGemini = useCallback(async () => {
    if (!preview || selectedEmailIds.size === 0) return;

    const selectedEmails = preview.emails.filter(e => selectedEmailIds.isSelected(e.id));

    const emailsData = selectedEmails.map(e => ({
      subject: e.subject,
      from: e.from,
      date: e.date,
      snippet: e.body.substring(0, snippetLength)
    }));

    const prompt = t('settings.emailScan.promptTemplate', {
      emails: JSON.stringify(emailsData, null, 2)
    });

    const requireApiKey = (): string | null => {
      if (geminiKeyInMemory) return geminiKeyInMemory;
      dispatch({ type: 'SET_SHOW_GEMINI_MODAL', value: true });
      return null;
    };

    const apiKey = requireApiKey();
    if (!apiKey) return;

    dispatch({ type: 'SET_GEMINI_PROCESSING', value: true });
    try {
      const response = await callGeminiApi(apiKey, prompt, {
        generationConfig: { responseMimeType: 'application/json' },
      });

      const { additions, updates } = processManualScanJson(response, applications);

      setPreview(prev => ({
        proposedAdditions: [...(prev?.proposedAdditions || []), ...additions],
        proposedUpdates: [...(prev?.proposedUpdates || []), ...updates],
        emails: prev?.emails || []
      }));

      selectedAdditions.selectAll(additions.map(a => a.id));
      selectedUpdates.selectAll(updates.map(u => u.id));
      showSuccess(t('settings.emailScan.geminiSuccess', { count: additions.length + updates.length }));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('settings.emailScan.geminiError');
      showError(message);
    } finally {
      dispatch({ type: 'SET_GEMINI_PROCESSING', value: false });
    }
  }, [preview, selectedEmailIds, snippetLength, geminiKeyInMemory, applications, setPreview, selectedAdditions, selectedUpdates, showSuccess, showError, t]);

  const handleGeminiKeySuccess = useCallback((apiKey: string) => {
    dispatch({ type: 'SET_SHOW_GEMINI_MODAL', value: false });
    setDecryptedKey(apiKey);
  }, [setDecryptedKey]);

  const showAuthed = hasGoogleLinked && hasValidToken;

  return (
    <div className="space-y-6">
      <div className='bg-card rounded p-6 border border-border dark:border-border'>
        <EmailScanHeader />

        <ScanAuthGate
          status={scanAuthStatus}
          onTokenCheck={checkToken}
        >

        {showAuthed && (
          <EmailScanTabs
            activeTab={activeTab}
            onTabChange={(v) => dispatch({ type: 'SET_ACTIVE_TAB', value: v })}
          />
        )}

        {showAuthed && (
          <EmailScanErrorBanner error={error} />
        )}

        {showAuthed && (
          <EmailScanControls
            scanMonths={scanMonths}
            onScanMonthsChange={(v) => dispatch({ type: 'SET_SCAN_MONTHS', value: v })}
            onScan={handleScanGmail}
            loading={loading}
            hasPreview={!!preview}
            onClearPreview={clearPreview}
            onApply={handleApplySelected}
            applying={applying}
            selectionCount={selectedAdditions.size + selectedUpdates.size}
          />
        )}

        {showAuthed && activeTab === 'manual' && (
          <ManualProcessingPanel
            preview={preview}
            snippetLength={snippetLength}
            setSnippetLength={(v) => dispatch({ type: 'SET_SNIPPET_LENGTH', value: v })}
            processingMode={processingMode}
            setProcessingMode={(v) => dispatch({ type: 'SET_PROCESSING_MODE', value: v })}
            selectedEmailIds={selectedEmailIds}
            enabledChatbots={preferences.enabledChatbots || ['ChatGPT', 'Claude', 'Gemini']}
            geminiProcessing={geminiProcessing}
            pastedJson={pastedJson}
            setPastedJson={(v) => dispatch({ type: 'SET_PASTED_JSON', value: v })}
            onGeneratePrompt={handleGeneratePrompt}
            onProcessWithGemini={handleProcessWithGemini}
            onProcessJson={handleProcessJson}
          />
        )}

        {showAuthed && preview && (
          <ScanResults
            preview={preview}
            applications={applications}
            selectedAdditions={selectedAdditions}
            selectedUpdates={selectedUpdates}
            forceAddIds={forceAddIds}
            formatDate={formatShortDate}
          />
        )}
        </ScanAuthGate>

      </div>

      <GeminiKeyModal
        isOpen={showGeminiModal}
        onClose={() => dispatch({ type: 'SET_SHOW_GEMINI_MODAL', value: false })}
        onSuccess={handleGeminiKeySuccess}
      />
    </div>
  );
}
