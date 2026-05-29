import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useSelection } from '../hooks/useSelection';
import { useEmailScan } from '../mails/hooks/useEmailScan';
import { isGmailRateLimitError } from '../mails/errors';
import { GmailEmailClient } from '../mails/providers/gmail/gmailClient';
import type { ProposedAddition, ProposedUpdate } from '../mails/types';
import { getAuthCookie } from '../utils/api';
import { useAlert } from './AlertProvider';
import { useApplicationsStore } from '../stores/applicationsStore';
import { useAuthStore } from '../stores/authStore';
import { ConnectGoogleButton } from './ConnectGoogleButton';
import { usePreferencesStore } from '../stores/preferencesStore';
import { useGeminiKeyStore } from '../store/geminiKeyStore';
import { CHATBOTS } from '../utils/constants';
import { isApplicationDuplicate } from '../utils/applications';
import { processManualScanJson } from '../utils/manualScan';
import { callGeminiApi } from '../utils/geminiApi';
import { ProposedAdditionItem } from './ProposedAdditionItem';
import { ProposedUpdateItem } from './ProposedUpdateItem';
import { GeminiKeyModal } from './GeminiKeyModal';
import { useFormatDate } from '../hooks/useFormatDate';
import { useGoogleToken } from '../hooks/useGoogleToken';

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

  const [activeTab, setActiveTab] = useState<'automatic' | 'manual'>('automatic');
  const [processingMode, setProcessingMode] = useState<'manual' | 'api'>('manual');
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [geminiProcessing, setGeminiProcessing] = useState(false);
  const selectedAdditions = useSelection<string>();
  const selectedUpdates = useSelection<string>();

  // Manual tab states
  const [scanMonths, setScanMonths] = useState(preferences.emailScanMonths || 3);
  const [snippetLength, setSnippetLength] = useState(200);
  const selectedEmailIds = useSelection<string>();
  const [pastedJson, setPastedJson] = useState('');
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

  const selectAllAdditions = useCallback(() => {
    if (!preview) return;
    selectedAdditions.selectAll(preview.proposedAdditions.map((a) => a.id));
  }, [preview, selectedAdditions]);

  const selectAllUpdates = useCallback(() => {
    if (!preview) return;
    selectedUpdates.selectAll(preview.proposedUpdates.map((u) => u.id));
  }, [preview, selectedUpdates]);

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
      setPastedJson('');
      showSuccess('JSON procesado correctamente');
    } catch {
      showError(t('settings.emailScan.invalidJson'));
    }
  }, [pastedJson, applications, setPreview, showSuccess, showError, t, selectedAdditions, selectedUpdates]);

  const geminiKeyInMemory = useGeminiKeyStore((state) => state.geminiKeyInMemory);
  const setDecryptedKey = useGeminiKeyStore((state) => state.setDecryptedKey);
  const currentUser = useAuthStore((state) => state.currentUser);
  const hasGoogleLinked = !!(currentUser?.googleId);

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
      setShowGeminiModal(true);
      return null;
    };

    const apiKey = requireApiKey();
    if (!apiKey) return;

    setGeminiProcessing(true);
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
      setGeminiProcessing(false);
    }
  }, [preview, selectedEmailIds, snippetLength, geminiKeyInMemory, applications, setPreview, selectedAdditions, selectedUpdates, showSuccess, showError, t]);

  const handleGeminiKeySuccess = useCallback((apiKey: string) => {
    setShowGeminiModal(false);
    setDecryptedKey(apiKey);
  }, [setDecryptedKey]);

  const selectAllEmails = () => {
    if (!preview) return;
    selectedEmailIds.selectAll(preview.emails.map(e => e.id));
  };

  return (
    <div className="space-y-6">
      <div className='bg-white dark:bg-earth-800 rounded p-6 border border-earth-100 dark:border-earth-700'>
        <h2 className="text-2xl font-semibold text-earth-800 dark:text-earth-100 mb-2">
          {t('settings.emailScan.title')}
        </h2>
        <p className="text-sm text-earth-500 dark:text-earth-400 mb-6">
          {t('settings.emailScan.subtitle')}
        </p>

        {isChecking && (
          <div className="flex items-center justify-center py-8 mb-6">
            <span className="size-5 border-2 border-sage-400 border-t-transparent rounded-full animate-spin mr-2" />
            <span className="text-sm text-earth-500 dark:text-earth-400">{t('common.loading')}</span>
          </div>
        )}

        {!isChecking && !hasGoogleLinked && (
          <div className="bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-700 rounded-lg p-6 mb-6">
            <div className="text-center">
              <div className="size-12 mx-auto mb-3 rounded-full bg-sage-100 dark:bg-sage-800 flex items-center justify-center">
                <svg className="size-6 text-sage-600 dark:text-sage-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 5.25 1.65 5.25 1.65l1.83-1.8S16.22 2 12.17 2C6.63 2 2 6.44 2 12c0 5.52 4.46 10 10 10 5.14 0 9.35-3.65 9.35-8.77 0-1.15-.14-2.13 0-2.13z" fill="#4285F4"/>
                </svg>
              </div>
              <h4 className="text-sm font-semibold text-sage-700 dark:text-sage-300 mb-2">
                {t('settings.emailScan.googleNotLinked')}
              </h4>
              <p className="text-xs text-sage-600 dark:text-sage-400 mb-4">
                {t('settings.emailScan.googleNotLinkedDesc')}
              </p>
              <ConnectGoogleButton
                label={t('settings.cloud.linkGoogle')}
                onSuccess={checkToken}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-sage-600 text-white hover:bg-sage-700 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        )}

        {!isChecking && hasGoogleLinked && !hasValidToken && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-6 mb-6">
            <div className="text-center">
              <div className="size-12 mx-auto mb-3 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
                <svg className="size-6 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0-8v4m0 0a9 9 0 110-18 9 9 0 010 18z" />
                </svg>
              </div>
              <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">
                {t('settings.emailScan.googleSessionExpired')}
              </h4>
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
                {t('settings.emailScan.googleSessionExpiredDesc')}
              </p>
              <ConnectGoogleButton
                label={t('settings.cloud.linkGoogle')}
                onSuccess={checkToken}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        )}

        {hasGoogleLinked && hasValidToken && (
        <div className="flex border-b border-earth-200 dark:border-earth-700 mb-6">
          <button
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'automatic'
                ? 'border-b-2 border-sage-600 text-sage-600'
                : 'text-earth-500 hover:text-earth-700 dark:text-earth-400'
            }`}
            onClick={() => setActiveTab('automatic')}
            type="button"
          >
            {t('settings.emailScan.tabs.automatic')}
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'manual'
                ? 'border-b-2 border-sage-600 text-sage-600'
                : 'text-earth-500 hover:text-earth-700 dark:text-earth-400'
            }`}
            onClick={() => setActiveTab('manual')}
            type="button"
          >
            {t('settings.emailScan.tabs.manual')}
          </button>
        </div>
        )}

        {hasGoogleLinked && hasValidToken && error && (
          <div
            className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm"
            role="alert"
          >
            {isGmailRateLimitError(error)
              ? t('settings.emailScan.rateLimitError')
              : error.message}
          </div>
        )}

        {hasGoogleLinked && hasValidToken && (
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-earth-500 dark:text-earth-400 uppercase tracking-wider">
              {t('settings.emailScan.scanPeriod')}
            </label>
            <select
              value={scanMonths}
              onChange={(e) => setScanMonths(parseInt(e.target.value))}
              disabled={loading}
              aria-label={t('settings.emailScan.scanPeriod')}
              className='px-3 py-2 rounded border-earth-300 dark:border-earth-600 bg-white dark:bg-earth-800 text-sm font-medium focus:ring-2 focus:ring-sage-500 outline-none disabled:opacity-50 transition-all'
            >
              <option value={3}>{t('settings.emailScan.months', { count: 3 })}</option>
              <option value={6}>{t('settings.emailScan.months', { count: 6 })}</option>
              <option value={9}>{t('settings.emailScan.months', { count: 9 })}</option>
              <option value={12}>{t('settings.emailScan.months', { count: 12 })}</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleScanGmail}
            disabled={loading}
            className='px-4 py-2 rounded font-medium bg-sage-600 text-white hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition h-[38px] flex items-center gap-2'
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
          {preview && (
            <>
              <button
                type="button"
                onClick={clearPreview}
                className='px-4 py-2 rounded font-medium border border-earth-300 dark:border-earth-600 text-earth-700 dark:text-earth-300 hover:bg-earth-100 dark:hover:bg-earth-700 transition'
              >
                {t('settings.emailScan.clearPreview')}
              </button>
              <button
                type="button"
                onClick={handleApplySelected}
                disabled={
                  applying ||
                  (selectedAdditions.size === 0 && selectedUpdates.size === 0)
                }
                className='px-4 py-2 rounded font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition'
              >
                {applying
                  ? t('settings.emailScan.applying')
                  : t('settings.emailScan.applySelected', {
                      count: selectedAdditions.size + selectedUpdates.size,
                    })}
              </button>
            </>
          )}
        </div>
        )}

        {hasGoogleLinked && hasValidToken && activeTab === 'manual' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2 bg-earth-100 dark:bg-earth-700/50 rounded-lg p-1 w-fit">
              <button
                onClick={() => setProcessingMode('manual')}
                type="button"
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  processingMode === 'manual'
                    ? 'bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100 shadow-sm'
                    : 'text-earth-500 dark:text-earth-400 hover:text-earth-700 dark:hover:text-earth-300'
                }`}
              >
                {t('settings.emailScan.processingModes.manual')}
              </button>
              <button
                onClick={() => setProcessingMode('api')}
                type="button"
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  processingMode === 'api'
                    ? 'bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100 shadow-sm'
                    : 'text-earth-500 dark:text-earth-400 hover:text-earth-700 dark:hover:text-earth-300'
                }`}
              >
                {t('settings.emailScan.processingModes.api')}
              </button>
            </div>

            {preview && (
              <div className='bg-earth-50 dark:bg-earth-700/50 rounded p-4 space-y-4 border border-earth-200 dark:border-earth-600'>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label htmlFor="snippetLength" className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">
                        {t('settings.emailScan.snippetLength')}
                      </label>
                      <input
                        type="number"
                        id="snippetLength"
                        value={snippetLength}
                        onChange={(e) => setSnippetLength(parseInt(e.target.value) || 200)}
                        aria-label={t('settings.emailScan.snippetLength')}
                        className='w-full px-3 py-2 border border-earth-300 dark:border-earth-600 rounded bg-white dark:bg-earth-800 text-sm'
                      />
                    </div>
                  </div>

                  {processingMode === 'manual' && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-earth-700 dark:text-earth-300">
                        {t('settings.emailScan.generatePrompt')}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleGeneratePrompt()}
                          disabled={selectedEmailIds.size === 0}
                          className='px-4 py-2 rounded font-medium border border-sage-200 text-sage-700 hover:bg-sage-50 dark:border-sage-900/30 dark:text-sage-300 dark:hover:bg-sage-900/20 transition flex items-center gap-2'
                        >
                          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          {t('common.copy')}
                        </button>

                        {(() => { const enabled = preferences.enabledChatbots || ['ChatGPT', 'Claude', 'Gemini']; const enabledSet = new Set(enabled); return CHATBOTS.filter(cb => enabledSet.has(cb.id)); })().map(chatbot => (
                          <button
                            type="button"
                            key={chatbot.id}
                            onClick={() => handleGeneratePrompt(chatbot)}
                            disabled={selectedEmailIds.size === 0}
                            className='px-4 py-2 rounded font-medium bg-sage-600 text-white hover:bg-sage-700 transition flex items-center gap-2'
                          >
                            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            {t('settings.emailScan.copyAndOpen', { name: chatbot.name })}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {processingMode === 'api' && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-earth-700 dark:text-earth-300">
                        {t('settings.emailScan.processWithGemini')}
                      </label>
                      <button
                        type="button"
                        onClick={handleProcessWithGemini}
                        disabled={selectedEmailIds.size === 0 || geminiProcessing}
                        className='px-4 py-2 rounded font-medium bg-terracotta-600 text-white hover:bg-terracotta-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2'
                      >
                        {geminiProcessing ? (
                          <>
                            <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            {t('settings.emailScan.geminiProcessing')}
                          </>
                        ) : (
                          <>
                            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            {t('settings.emailScan.processWithGeminiAction')}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-earth-700 dark:text-earth-300">
                      {t('settings.emailScan.emailsFound', { count: preview.emails.length })}
                    </h4>
                    <button type="button" onClick={selectAllEmails} className="text-xs text-sage-600 hover:underline">
                      {t('settings.emailScan.selectAll')}
                    </button>
                  </div>
                  <div className='max-h-60 overflow-y-auto border border-earth-200 dark:border-earth-600 rounded divide-y divide-earth-100 dark:divide-earth-700 bg-white dark:bg-earth-800'>
                    {preview.emails.map(email => (
                      <div key={email.id} className='flex items-start gap-3 px-3 py-2 hover:bg-earth-50 dark:hover:bg-earth-700/50'>
                        <input
                          type="checkbox"
                          checked={selectedEmailIds.isSelected(email.id)}
                          onChange={() => selectedEmailIds.toggle(email.id)}
                          className="mt-1"
                          aria-label={`Select email: ${email.subject}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className='text-sm font-medium text-earth-900 dark:text-earth-100 truncate'>{email.subject}</p>
                          <p className='text-xs text-earth-500 truncate'>{email.from}</p>
                        </div>
                        <span className='text-[10px] text-earth-400 whitespace-nowrap'>{formatShortDate(email.date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className='bg-earth-50 dark:bg-earth-700/50 rounded p-4 space-y-2 border border-earth-200 dark:border-earth-600'>
              <label className="block text-sm font-medium text-earth-700 dark:text-earth-300">
                {t('settings.emailScan.pasteJson')}
              </label>
              <textarea
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                aria-label={t('settings.emailScan.pasteJson')}
                className='w-full h-32 px-3 py-2 border border-earth-300 dark:border-earth-600 rounded bg-white dark:bg-earth-800 text-sm font-mono'
                placeholder='{ "additions": [...], "updates": [...] }'
              />
              <button
                type="button"
                onClick={handleProcessJson}
                disabled={!pastedJson.trim()}
                className='w-full px-4 py-2 rounded font-medium bg-green-600 text-white hover:bg-green-700 transition'
              >
                {t('settings.emailScan.processJson')}
              </button>
            </div>
          </div>
        )}

        {hasGoogleLinked && hasValidToken && preview && (
          <div className="space-y-6 mt-8">
            {(preview.proposedAdditions.length > 0) && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-3">
                  <h3 className='text-lg font-semibold text-earth-800 dark:text-earth-100 flex items-center gap-2'>
                    <span className='flex size-6 items-center justify-center rounded-full bg-sage-100 text-sage-700 text-xs dark:bg-sage-900/40 dark:text-sage-300'>
                      {preview.proposedAdditions.length}
                    </span>
                    {t('settings.emailScan.newApplications', {
                      count: preview.proposedAdditions.length,
                    })}
                  </h3>
                  <button
                    type="button"
                    onClick={selectAllAdditions}
                    className="text-sm text-sage-600 dark:text-sage-400 hover:underline"
                  >
                    {t('settings.emailScan.selectAll')}
                  </button>
                </div>
                <ul className="grid gap-3">
                  {preview.proposedAdditions.map((addition: ProposedAddition) => (
                    <ProposedAdditionItem
                      key={addition.id}
                      addition={addition}
                      isSelected={selectedAdditions.isSelected(addition.id)}
                      onToggle={() => selectedAdditions.toggle(addition.id)}
                      duplicate={isApplicationDuplicate(applications, addition.data.company, addition.data.position)}
                      isForced={forceAddIds.isSelected(addition.id)}
                      onToggleForce={(forced) => {
                        if (forced) forceAddIds.select(addition.id);
                        else forceAddIds.deselect(addition.id);
                      }}
                      formatDate={formatShortDate}
                    />
                  ))}
                </ul>
              </section>
            )}

            {preview.proposedUpdates.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-earth-800 dark:text-earth-100 flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs dark:bg-green-900/40 dark:text-green-300">
                      {preview.proposedUpdates.length}
                    </span>
                    {t('settings.emailScan.updatesToExisting', {
                      count: preview.proposedUpdates.length,
                    })}
                  </h3>
                  <button
                    type="button"
                    onClick={selectAllUpdates}
                    className="text-sm text-sage-600 dark:text-sage-400 hover:underline"
                  >
                    {t('settings.emailScan.selectAll')}
                  </button>
                </div>
                <ul className="grid gap-3">
                  {preview.proposedUpdates.map((update: ProposedUpdate) => (
                    <ProposedUpdateItem
                      key={update.id}
                      update={update}
                      isSelected={selectedUpdates.isSelected(update.id)}
                      onToggle={() => selectedUpdates.toggle(update.id)}
                      formatDate={formatShortDate}
                    />
                  ))}
                </ul>
              </section>
            )}

            {preview.proposedAdditions.length === 0 &&
              preview.proposedUpdates.length === 0 && (
                <div className='text-center py-12 bg-earth-50 dark:bg-earth-700/30 rounded border-2 border-dashed border-earth-200 dark:border-earth-700'>
                  <p className='text-earth-500 dark:text-earth-400'>
                    {t('settings.emailScan.nothingFound')}
                  </p>
                </div>
              )}
          </div>
        )}

      </div>

      <GeminiKeyModal
        isOpen={showGeminiModal}
        onClose={() => setShowGeminiModal(false)}
        onSuccess={handleGeminiKeySuccess}
      />
    </div>
  );
}
