import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useEmailScan } from '../mails/hooks/useEmailScan';
import { isGmailRateLimitError } from '../mails/errors';
import { GmailEmailClient } from '../mails/providers/gmail/gmailClient';
import type { ProposedAddition, ProposedUpdate } from '../mails/types';
import { getAuthCookie } from '../utils/api';
import { useAlert } from './AlertProvider';
import { useApplicationsStore } from '../stores/applicationsStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { CHATBOTS } from '../utils/constants';
import type { InterviewStageType } from '../types/applications';

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
  const [selectedAdditions, setSelectedAdditions] = useState<Set<string>>(new Set());
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());

  // Manual tab states
  const [scanMonths, setScanMonths] = useState(preferences.emailScanMonths || 3);
  const [snippetLength, setSnippetLength] = useState(200);
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [pastedJson, setPastedJson] = useState('');
  const [forceAddIds, setForceAddIds] = useState<Set<string>>(new Set());

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
      setSelectedAdditions(new Set());
      setSelectedUpdates(new Set());
      if (result) {
        setSelectedEmailIds(new Set(result.emails.map(e => e.id)));
      }
    } catch (err) {
      const message = isGmailRateLimitError(err)
        ? t('settings.emailScan.rateLimitError')
        : (err instanceof Error ? err.message : t('settings.emailScan.scanError'));
      showError(message);
    }
  }, [scan, showError, t]);

  const toggleAddition = useCallback((id: string) => {
    setSelectedAdditions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleUpdate = useCallback((id: string) => {
    setSelectedUpdates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllAdditions = useCallback(() => {
    if (!preview) return;
    setSelectedAdditions(new Set(preview.proposedAdditions.map((a) => a.id)));
  }, [preview]);

  const selectAllUpdates = useCallback(() => {
    if (!preview) return;
    setSelectedUpdates(new Set(preview.proposedUpdates.map((u) => u.id)));
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
      setSelectedAdditions((prev) => {
        const next = new Set(prev);
        additions.forEach((a) => next.delete(a.id));
        return next;
      });
      setSelectedUpdates((prev) => {
        const next = new Set(prev);
        updates.forEach((u) => next.delete(u.id));
        return next;
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

  const handleProcessJson = useCallback(() => {
    try {
      const data = JSON.parse(pastedJson);
      const additions: ProposedAddition[] = (data.additions || []).map((a: any, index: number) => ({
        id: `json-add-${index}-${Date.now()}`,
        data: {
          position: a.position || 'Unknown',
          company: a.company || 'Unknown',
          salary: '',
          status: a.status || 'Applied',
          applicationDate: a.applicationDate || new Date().toISOString().split('T')[0],
          interviewDate: '',
          timeline: [
            {
              id: crypto.randomUUID(),
              type: 'application_submitted',
              date: a.applicationDate || new Date().toISOString().split('T')[0],
              notes: a.notes || '',
              status: 'completed',
            }
          ],
          notes: a.notes || '',
          link: '',
          platform: a.platform || 'Email',
          contactName: '',
          followUpDate: '',
        },
        source: { subject: 'Chatbot extraction', date: new Date().toISOString() }
      }));

      const updates: ProposedUpdate[] = (data.updates || []).map((u: any, index: number) => {
        const existingApp = applications.find(app =>
          app.company.toLowerCase().trim() === u.company.toLowerCase().trim() &&
          app.position.toLowerCase().trim() === u.position.toLowerCase().trim() &&
          app.status !== 'Deleted'
        );

        return {
          id: `json-update-${index}-${Date.now()}`,
          applicationId: existingApp?.id || '',
          company: u.company || 'Unknown',
          position: u.position || 'Unknown',
          newEvent: {
            id: crypto.randomUUID(),
            type: (u.newEvent?.type as InterviewStageType) || 'first_contact',
            date: u.newEvent?.date || new Date().toISOString().split('T')[0],
            notes: u.newEvent?.notes || '',
            status: (u.newEvent?.status as 'completed' | 'pending' | 'canceled') || 'completed',
          },
          source: { subject: 'Chatbot extraction', date: new Date().toISOString() }
        };
      });

      setPreview(prev => ({
        proposedAdditions: [...(prev?.proposedAdditions || []), ...additions],
        proposedUpdates: [...(prev?.proposedUpdates || []), ...updates],
        emails: prev?.emails || []
      }));

      setSelectedAdditions(new Set(additions.map(a => a.id)));
      setSelectedUpdates(new Set(updates.map(u => u.id)));
      setPastedJson('');
      showSuccess('JSON procesado correctamente');
    } catch (err) {
      showError(t('settings.emailScan.invalidJson'));
    }
  }, [pastedJson, applications, setPreview, showSuccess, showError, t]);

  const toggleEmailSelection = (id: string) => {
    setSelectedEmailIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllEmails = () => {
    if (!preview) return;
    setSelectedEmailIds(new Set(preview.emails.map(e => e.id)));
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
                          checked={selectedEmailIds.has(email.id)}
                          onChange={() => toggleEmailSelection(email.id)}
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
                  {preview.proposedAdditions.map((item: ProposedAddition) => {
                    const duplicate = isDuplicate(item.data.company, item.data.position);
                    const isForced = forceAddIds.has(item.id);
                    const disabled = duplicate && !isForced;

                    return (
                      <li
                        key={item.id}
                        className={`group flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
                          duplicate
                            ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30'
                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 shadow-sm'
                        }`}
                      >
                        <input
                          type="checkbox"
                          id={item.id}
                          checked={selectedAdditions.has(item.id)}
                          onChange={() => toggleAddition(item.id)}
                          disabled={disabled}
                          className="mt-1 h-5 w-5 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-30"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <label htmlFor={item.id} className="font-bold text-gray-900 dark:text-white cursor-pointer group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {item.data.position} <span className="text-gray-400 font-normal mx-1">@</span> {item.data.company}
                            </label>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {item.data.platform}
                            </span>
                          </div>

                          {duplicate && (
                            <div className="flex flex-col gap-2 mt-2 mb-3">
                              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-medium">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                {t('settings.emailScan.duplicateWarning')}
                              </div>
                              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isForced}
                                  onChange={(e) => {
                                    setForceAddIds(prev => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(item.id);
                                      else next.delete(item.id);
                                      return next;
                                    });
                                  }}
                                  className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-indigo-600"
                                />
                                {t('settings.emailScan.addAnyway')}
                              </label>
                            </div>
                          )}

                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
                              {item.source.subject}
                            </p>
                            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                              {formatDate(item.source.date)}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
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
                  {preview.proposedUpdates.map((item: ProposedUpdate) => (
                    <li
                      key={item.id}
                      className="group flex items-start gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-500/50 shadow-sm transition-all duration-200"
                    >
                      <input
                        type="checkbox"
                        id={item.id}
                        checked={selectedUpdates.has(item.id)}
                        onChange={() => toggleUpdate(item.id)}
                        className="mt-1 h-5 w-5 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <label htmlFor={item.id} className="font-bold text-gray-900 dark:text-white cursor-pointer group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                            {item.position} <span className="text-gray-400 font-normal mx-1">@</span> {item.company}
                          </label>
                          <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">
                            +{t(`insights.interviewTypes.${item.newEvent.type}`)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
                            {item.source.subject}
                          </p>
                          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                            {formatDate(item.source.date)}
                          </span>
                        </div>
                      </div>
                    </li>
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
