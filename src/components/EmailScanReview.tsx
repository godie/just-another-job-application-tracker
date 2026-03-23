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
import { usePreferencesStore } from '../stores/preferencesStore';
import { CHATBOTS } from '../utils/constants';
import { isApplicationDuplicate } from '../utils/applications';
import { processManualScanJson } from '../utils/manualScan';
import { ProposedAdditionItem } from './ProposedAdditionItem';
import { ProposedUpdateItem } from './ProposedUpdateItem';

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

  const [activeTab, setActiveTab] = useState<'automatic' | 'manual'>('automatic');
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
        showError(t('settings.emailScan.signInRequired'));
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
  }, [scan, showError, t]);

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
      showSuccess(t('settings.emailScan.jsonProcessedSuccess') === 'settings.emailScan.jsonProcessedSuccess' ? 'JSON procesado correctamente' : t('settings.emailScan.jsonProcessedSuccess'));
    } catch {
      showError(t('settings.emailScan.invalidJson'));
    }
  }, [pastedJson, applications, setPreview, showSuccess, showError, t, selectedAdditions, selectedUpdates]);

  const selectAllEmails = () => {
    if (!preview) return;
    selectedEmailIds.selectAll(preview.emails.map(e => e.id));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {t('settings.emailScan.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {t('settings.emailScan.subtitle')}
        </p>

        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'automatic'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
            onClick={() => setActiveTab('automatic')}
          >
            {t('settings.emailScan.tabs.automatic')}
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'manual'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
            onClick={() => setActiveTab('manual')}
          >
            {t('settings.emailScan.tabs.manual')}
          </button>
        </div>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm"
            role="alert"
          >
            {isGmailRateLimitError(error)
              ? t('settings.emailScan.rateLimitError')
              : error.message}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('settings.emailScan.scanPeriod')}
            </label>
            <select
              value={scanMonths}
              onChange={(e) => setScanMonths(parseInt(e.target.value))}
              disabled={loading}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 transition-all"
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
            className="px-4 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition h-[38px] flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                className="px-4 py-2 rounded-lg font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
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
                className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
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

        {activeTab === 'manual' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
            {preview && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4 border border-gray-200 dark:border-gray-600">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label htmlFor="snippetLength" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('settings.emailScan.snippetLength')}
                      </label>
                      <input
                        type="number"
                        id="snippetLength"
                        value={snippetLength}
                        onChange={(e) => setSnippetLength(parseInt(e.target.value) || 200)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings.emailScan.generatePrompt')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleGeneratePrompt()}
                        disabled={selectedEmailIds.size === 0}
                        className="px-4 py-2 rounded-lg font-medium border border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/20 transition flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        {t('common.copy')}
                      </button>

                      {CHATBOTS.filter(cb => (preferences.enabledChatbots || ['ChatGPT', 'Claude', 'Gemini']).includes(cb.id)).map(chatbot => (
                        <button
                          key={chatbot.id}
                          onClick={() => handleGeneratePrompt(chatbot)}
                          disabled={selectedEmailIds.size === 0}
                          className="px-4 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          {t('settings.emailScan.copyAndOpen', { name: chatbot.name })}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t('settings.emailScan.emailsFound', { count: preview.emails.length })}
                    </h4>
                    <button onClick={selectAllEmails} className="text-xs text-indigo-600 hover:underline">
                      {t('settings.emailScan.selectAll')}
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {preview.emails.map(email => (
                      <div key={email.id} className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <input
                          type="checkbox"
                          checked={selectedEmailIds.isSelected(email.id)}
                          onChange={() => selectedEmailIds.toggle(email.id)}
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{email.subject}</p>
                          <p className="text-xs text-gray-500 truncate">{email.from}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{formatDate(email.date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2 border border-gray-200 dark:border-gray-600">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.emailScan.pasteJson')}
              </label>
              <textarea
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-mono"
                placeholder='{ "additions": [...], "updates": [...] }'
              />
              <button
                onClick={handleProcessJson}
                disabled={!pastedJson.trim()}
                className="w-full px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition"
              >
                {t('settings.emailScan.processJson')}
              </button>
            </div>
          </div>
        )}

        {preview && (
          <div className="space-y-6 mt-8">
            {(preview.proposedAdditions.length > 0) && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs dark:bg-indigo-900/40 dark:text-indigo-300">
                      {preview.proposedAdditions.length}
                    </span>
                    {t('settings.emailScan.newApplications', {
                      count: preview.proposedAdditions.length,
                    })}
                  </h3>
                  <button
                    type="button"
                    onClick={selectAllAdditions}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
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
                      formatDate={formatDate}
                    />
                  ))}
                </ul>
              </section>
            )}

            {preview.proposedUpdates.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs dark:bg-green-900/40 dark:text-green-300">
                      {preview.proposedUpdates.length}
                    </span>
                    {t('settings.emailScan.updatesToExisting', {
                      count: preview.proposedUpdates.length,
                    })}
                  </h3>
                  <button
                    type="button"
                    onClick={selectAllUpdates}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
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
                      formatDate={formatDate}
                    />
                  ))}
                </ul>
              </section>
            )}

            {preview.proposedAdditions.length === 0 &&
              preview.proposedUpdates.length === 0 && (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('settings.emailScan.nothingFound')}
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
