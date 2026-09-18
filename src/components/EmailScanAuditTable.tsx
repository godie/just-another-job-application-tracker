import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScanAuditRow } from '../mails/types';
import {
  reclassifyRowsLocally,
  type LocalReclassification,
} from '../mails/services/localReclassify';
import { EMAIL_EVENT_TYPES, type EmailEventType } from '../utils/emailClassification';
import {
  REJECTION_KINDS,
  auditStats,
  effectiveEventType,
  loadAuditLabels,
  loadImportedAudit,
  parseAuditImport,
  pendingRows,
  reviewedRows,
  saveAuditLabels,
  saveImportedAudit,
  toAuditCsv,
  toAuditJson,
  updateAuditLabel,
  type AuditImport,
  type AuditLabels,
  type RejectionKind,
} from '../utils/scanAudit';
import { Button } from './ui/Button';
import { useAlert } from './AlertProvider';

interface EmailScanAuditTableProps {
  rows: ScanAuditRow[];
}

const OUTCOME_CLASSES: Record<ScanAuditRow['outcome'], string> = {
  addition: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  update: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  skipped: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
  no_event: 'bg-muted text-muted-foreground',
};

type View = 'pending' | 'reviewed';

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Audit table for the last scan: every email that was looked at, what the
 * pipeline decided, and an editable label per row. Rows move from "pending" to
 * "reviewed" as they are marked, so a long labelling pass never re-scrolls what
 * is already done. Exports the labels as JSON (the dataset used to tune the
 * classifier) or CSV (for a spreadsheet pass); the JSON can be imported back to
 * resume a pass without re-scanning the mailbox.
 */
export const EmailScanAuditTable: React.FC<EmailScanAuditTableProps> = ({ rows }) => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useAlert();
  const [labels, setLabels] = useState<AuditLabels>(() => loadAuditLabels());
  const [imported, setImported] = useState<AuditImport | null>(() => loadImportedAudit());
  const [view, setView] = useState<View>('pending');
  const [local, setLocal] = useState<LocalReclassification | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveAuditLabels(labels);
  }, [labels]);

  useEffect(() => {
    // A fresh scan is the new truth: it replaces an imported snapshot.
    if (rows.length > 0) {
      setImported(null);
      saveImportedAudit(null);
      setLocal(null);
    }
  }, [rows]);

  const source = imported?.rows ?? rows;
  const stats = useMemo(() => auditStats(source, labels), [source, labels]);
  const pending = useMemo(() => pendingRows(source, labels), [source, labels]);
  const reviewed = useMemo(() => reviewedRows(source, labels), [source, labels]);
  const visible = view === 'pending' ? pending : reviewed;

  const setLabel = (emailId: string, patch: Parameters<typeof updateAuditLabel>[2]) => {
    setLabels((current) => updateAuditLabel(current, emailId, patch));
  };

  /**
   * A field edit is a correction; a note or a rejection kind is not. It does
   * not finish the row: only the Correct/Wrong buttons do, otherwise the row
   * would jump to the reviewed tab in the middle of an edit.
   */
  const correctField = (emailId: string, patch: Parameters<typeof updateAuditLabel>[2]) => {
    setLabels((current) => updateAuditLabel(current, emailId, { ...patch, correct: false }));
  };

  const stamp = new Date().toISOString().split('T')[0];

  const handleCopy = async () => {
    if (stats.labelled === 0) {
      showError(t('settings.emailScan.audit.copyEmpty'));
      return;
    }
    const payload = toAuditJson(source, labels);
    try {
      await navigator.clipboard.writeText(payload);
      showSuccess(t('settings.emailScan.audit.copySuccess'));
      return;
    } catch {
      // Clipboard API needs a secure context; fall back to a selection copy.
      try {
        const textarea = document.createElement('textarea');
        textarea.value = payload;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (copied) {
          showSuccess(t('settings.emailScan.audit.copySuccess'));
          return;
        }
      } catch {
        // fall through to the error alert
      }
      showError(t('settings.emailScan.audit.copyError'));
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const parsed = parseAuditImport(await file.text());
    if (!parsed) {
      showError(t('settings.emailScan.audit.importError'));
      return;
    }
    setImported(parsed);
    saveImportedAudit(parsed);
    setLabels((current) => ({ ...current, ...parsed.labels }));
    setView('pending');
    setLocal(null);
    showSuccess(t('settings.emailScan.audit.importSuccess', { count: parsed.rows.length }));
  };

  const discardImport = () => {
    setImported(null);
    saveImportedAudit(null);
    setLocal(null);
  };

  const runLocalPass = () => {
    setLocal(reclassifyRowsLocally(source));
  };

  /** Marks the pipeline right or wrong; clicking the active mark undoes it. */
  const mark = (row: ScanAuditRow, correct: boolean) => {
    const label = labels[row.emailId];
    const undo = label?.reviewed && label.correct === correct;
    setLabel(row.emailId, {
      reviewed: !undo,
      correct: undo ? undefined : correct,
      reviewedAt: new Date().toISOString(),
      ...(undo
        ? {}
        : { eventType: label?.eventType ?? effectiveEventType(row) ?? undefined }),
    });
  };

  const importButton = (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        onChange={handleFile}
        className="hidden"
        data-testid="audit-import-input"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInput.current?.click()}
        data-testid="audit-import"
      >
        {t('settings.emailScan.audit.importJson')}
      </Button>
    </>
  );

  if (rows.length === 0 && !imported) {
    return (
      <div className="space-y-3" data-testid="audit-empty">
        <p className="text-sm text-muted-foreground py-2">
          {t('settings.emailScan.audit.noRows')}
        </p>
        <p className="text-xs text-muted-foreground max-w-xl">
          {t('settings.emailScan.audit.importHint')}
        </p>
        <div className="flex gap-2">{importButton}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="audit-table">
      {imported && (
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded border border-border bg-muted/40 p-3"
          data-testid="audit-import-banner"
        >
          <p className="text-xs text-muted-foreground">
            {t('settings.emailScan.audit.importedBanner', {
              count: imported.rows.length,
              date: imported.exportedAt?.split('T')[0] ?? '—',
            })}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={discardImport}>
            {t('settings.emailScan.audit.importDiscard')}
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t('settings.emailScan.audit.title')}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            {t('settings.emailScan.audit.hint')}
          </p>
          <p className="text-xs text-muted-foreground mt-1" data-testid="audit-stats">
            {t('settings.emailScan.audit.stats', {
              total: stats.total,
              reviewed: stats.reviewed,
              correct: stats.correct,
              corrected: stats.corrected,
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            data-testid="audit-copy"
            title={t('settings.emailScan.audit.copyHint')}
          >
            {t('settings.emailScan.audit.copyJson', { count: stats.labelled })}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => download(`jajat_scan_labels_${stamp}.json`, toAuditJson(source, labels), 'application/json')}
          >
            {t('settings.emailScan.audit.exportJson')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => download(`jajat_scan_labels_${stamp}.csv`, toAuditCsv(source, labels), 'text/csv')}
          >
            {t('settings.emailScan.audit.exportCsv')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={runLocalPass}
            disabled={source.length === 0}
            data-testid="audit-local"
          >
            {t('settings.emailScan.audit.reclassify')}
          </Button>
          {!imported && importButton}
        </div>
      </div>

      {local && (
        <p className="text-xs text-muted-foreground" data-testid="audit-local-summary">
          {t('settings.emailScan.audit.localSummary', {
            agree: local.agree,
            total: local.total,
          })}
        </p>
      )}

      <div className="flex gap-2" role="tablist" aria-label={t('settings.emailScan.audit.title')}>
        {(['pending', 'reviewed'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            data-testid={`audit-view-${key}`}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              view === key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            {t(`settings.emailScan.audit.views.${key}`, {
              count: key === 'pending' ? pending.length : reviewed.length,
            })}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4" data-testid="audit-view-empty">
          {t(`settings.emailScan.audit.views.${view}Empty`)}
        </p>
      ) : (
        <div className="overflow-x-auto border border-border rounded">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2 font-medium">{t('settings.emailScan.audit.columns.email')}</th>
                <th className="p-2 font-medium">{t('settings.emailScan.audit.columns.pipeline')}</th>
                <th className="p-2 font-medium">{t('settings.emailScan.audit.columns.label')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const label = labels[row.emailId] ?? {};
                const effectiveType = label.eventType ?? effectiveEventType(row) ?? '';
                const effective = effectiveEventType(row);
                const markedCorrect = Boolean(label.reviewed && label.correct === true);
                const markedWrong = Boolean(label.reviewed && label.correct === false);
                return (
                  <tr key={row.emailId} className="border-t border-border align-top">
                    <td className="p-2 max-w-xs">
                      <p className="font-medium text-foreground break-words">{row.subject}</p>
                      <p className="text-xs text-muted-foreground break-all">{row.from}</p>
                      <p className="text-xs text-muted-foreground">{row.date.split('T')[0]}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3 break-words">
                        {row.body.slice(0, 240)}
                      </p>
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          OUTCOME_CLASSES[row.outcome]
                        }`}
                      >
                        {t(`settings.emailScan.audit.outcomes.${row.outcome}`)}
                      </span>
                      <p
                        className="text-xs text-muted-foreground mt-1"
                        data-testid={`audit-pipeline-${row.emailId}`}
                      >
                        {effective
                          ? t(`settings.emailScan.audit.eventTypes.${effective}`)
                          : t('settings.emailScan.audit.noClassification')}
                        {row.effectiveEvent &&
                          ` · ${t(`settings.emailScan.audit.sources.${row.effectiveEvent.source}`)}`}
                        {row.classification && ` · ${row.classification.confidence.toFixed(2)}`}
                      </p>
                      <p className="text-xs text-foreground mt-1">
                        {row.extraction.position ?? t('settings.emailScan.audit.unknown')}
                        <span className="text-muted-foreground"> @ </span>
                        {row.extraction.company ?? t('settings.emailScan.audit.unknown')}
                      </p>
                      {local && (
                        <p className="text-xs mt-1" data-testid={`audit-local-${row.emailId}`}>
                          {local.results.get(row.emailId)?.type
                            ? t(
                                local.results.get(row.emailId)?.type ===
                                  (row.effectiveEvent?.type ?? row.classification?.type ?? null)
                                  ? 'settings.emailScan.audit.localAgrees'
                                  : 'settings.emailScan.audit.localDiffers',
                                { type: local.results.get(row.emailId)?.type },
                              )
                            : t('settings.emailScan.audit.localNone')}
                        </p>
                      )}
                      <div className="flex gap-1 mt-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={markedCorrect ? 'primary' : 'outline'}
                          onClick={() => mark(row, true)}
                          aria-pressed={markedCorrect}
                          data-testid={`audit-correct-${row.emailId}`}
                        >
                          {t('settings.emailScan.audit.actions.correct')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={markedWrong ? 'danger' : 'outline'}
                          onClick={() => mark(row, false)}
                          aria-pressed={markedWrong}
                          data-testid={`audit-incorrect-${row.emailId}`}
                        >
                          {t('settings.emailScan.audit.actions.incorrect')}
                        </Button>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-col gap-2 min-w-48">
                        <label className="text-xs text-muted-foreground">
                          {t('settings.emailScan.audit.fields.eventType')}
                          <select
                            value={effectiveType}
                            aria-label={`${t('settings.emailScan.audit.fields.eventType')} — ${row.subject}`}
                            onChange={(event) =>
                              correctField(row.emailId, {
                                eventType: (event.target.value || undefined) as EmailEventType | undefined,
                              })
                            }
                            className="mt-1 w-full text-xs rounded border border-border bg-background text-foreground p-1.5"
                          >
                            <option value="">{t('settings.emailScan.audit.fields.unset')}</option>
                            {EMAIL_EVENT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {t(`settings.emailScan.audit.eventTypes.${type}`)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-muted-foreground">
                          {t('settings.emailScan.audit.fields.position')}
                          <input
                            type="text"
                            value={label.position ?? ''}
                            placeholder={row.extraction.position ?? ''}
                            aria-label={`${t('settings.emailScan.audit.fields.position')} — ${row.subject}`}
                            onChange={(event) => correctField(row.emailId, { position: event.target.value })}
                            className="mt-1 w-full text-xs rounded border border-border bg-background text-foreground p-1.5"
                          />
                        </label>
                        <label className="text-xs text-muted-foreground">
                          {t('settings.emailScan.audit.fields.company')}
                          <input
                            type="text"
                            value={label.company ?? ''}
                            placeholder={row.extraction.company ?? ''}
                            aria-label={`${t('settings.emailScan.audit.fields.company')} — ${row.subject}`}
                            onChange={(event) => correctField(row.emailId, { company: event.target.value })}
                            className="mt-1 w-full text-xs rounded border border-border bg-background text-foreground p-1.5"
                          />
                        </label>
                        {effectiveType === 'rejected' && (
                          <label className="text-xs text-muted-foreground">
                            {t('settings.emailScan.audit.fields.rejectionKind')}
                            <select
                              value={label.rejectionKind ?? ''}
                              aria-label={`${t('settings.emailScan.audit.fields.rejectionKind')} — ${row.subject}`}
                              onChange={(event) =>
                                setLabel(row.emailId, {
                                  rejectionKind: (event.target.value || undefined) as RejectionKind | undefined,
                                })
                              }
                              className="mt-1 w-full text-xs rounded border border-border bg-background text-foreground p-1.5"
                            >
                              <option value="">{t('settings.emailScan.audit.fields.unset')}</option>
                              {REJECTION_KINDS.map((kind) => (
                                <option key={kind} value={kind}>
                                  {t(`settings.emailScan.audit.rejectionKinds.${kind}`)}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <label className="text-xs text-muted-foreground">
                          {t('settings.emailScan.audit.fields.note')}
                          <input
                            type="text"
                            value={label.note ?? ''}
                            aria-label={`${t('settings.emailScan.audit.fields.note')} — ${row.subject}`}
                            onChange={(event) => setLabel(row.emailId, { note: event.target.value })}
                            className="mt-1 w-full text-xs rounded border border-border bg-background text-foreground p-1.5"
                          />
                        </label>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
