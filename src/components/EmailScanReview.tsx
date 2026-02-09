import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useEmailScan } from '../mails/hooks/useEmailScan';
import { isGmailRateLimitError } from '../mails/errors';
import { GmailEmailClient } from '../mails/providers/gmail/gmailClient';
import type { ProposedAddition, ProposedUpdate } from '../mails/types';
import { getAuthCookie } from '../utils/api';
import { useAlert } from './AlertProvider';

export function EmailScanReview() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useAlert();
  const {
    scan,
    applySelected,
    loading,
    applying,
    error,
    preview,
    clearPreview,
  } = useEmailScan();

  const [selectedAdditions, setSelectedAdditions] = useState<Set<string>>(new Set());
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());

  const handleScanGmail = useCallback(async () => {
    try {
      const res = await getAuthCookie();
      if (!res.success || !res.access_token) {
        showError(t('settings.emailScan.signInRequired'));
        return;
      }
      const provider = new GmailEmailClient(res.access_token);
      await scan(provider);
      setSelectedAdditions(new Set());
      setSelectedUpdates(new Set());
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {t('settings.emailScan.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t('settings.emailScan.subtitle')}
        </p>

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

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleScanGmail}
            disabled={loading}
            className="px-4 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? t('settings.emailScan.scanning') : t('settings.emailScan.scanGmail')}
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
      </div>

      {preview && (
        <div className="space-y-6">
          {preview.proposedAdditions.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
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
              <ul className="border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-200 dark:divide-gray-600">
                {preview.proposedAdditions.map((item: ProposedAddition) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <input
                      type="checkbox"
                      id={item.id}
                      checked={selectedAdditions.has(item.id)}
                      onChange={() => toggleAddition(item.id)}
                      className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label htmlFor={item.id} className="flex-1 min-w-0 cursor-pointer">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {item.data.position} @ {item.data.company}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {item.source.subject}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(item.source.date)}
                      </p>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {preview.proposedUpdates.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
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
              <ul className="border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-200 dark:divide-gray-600">
                {preview.proposedUpdates.map((item: ProposedUpdate) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <input
                      type="checkbox"
                      id={item.id}
                      checked={selectedUpdates.has(item.id)}
                      onChange={() => toggleUpdate(item.id)}
                      className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label htmlFor={item.id} className="flex-1 min-w-0 cursor-pointer">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {item.position} @ {item.company}
                      </span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                        +{item.newEvent.type}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {item.source.subject}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(item.source.date)}
                      </p>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {preview.proposedAdditions.length === 0 &&
            preview.proposedUpdates.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('settings.emailScan.nothingFound')}
              </p>
            )}
        </div>
      )}
    </div>
  );
}
