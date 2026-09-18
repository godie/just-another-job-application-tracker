import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScanAuditRow } from '../mails/types';
import {
  reclassifyRowsLocally,
  type LocalReclassification,
} from '../mails/services/localReclassify';
import {
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
} from '../utils/scanAudit';
import { Button } from './ui/Button';
import { EmailScanAuditRow } from './EmailScanAuditRow';
import { useAlert } from './AlertProvider';

interface EmailScanAuditTableProps {
  rows: ScanAuditRow[];
}

type View = 'pending' | 'reviewed';

/** The imported set, and whether the reviewer loaded it on purpose this session. */
interface ImportState {
  data: AuditImport;
  explicit: boolean;
}

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
  const [imported, setImported] = useState<ImportState | null>(() => {
    const stored = loadImportedAudit();
    return stored ? { data: stored, explicit: false } : null;
  });
  const [view, setView] = useState<View>('pending');
  const [local, setLocal] = useState<{
    source: ScanAuditRow[];
    result: LocalReclassification;
  } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveAuditLabels(labels);
  }, [labels]);

  /**
   * A scan from this session wins over a stored import unless the reviewer
   * loaded one on purpose; the banner names the active dataset either way, so
   * nothing is replaced behind their back.
   */
  const source =
    imported && (imported.explicit || rows.length === 0) ? imported.data.rows : rows;
  /** A keyless pass only belongs to the set it was computed from. */
  const activeLocal = local?.source === source ? local.result : null;

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

  /** Marks the pipeline right or wrong; clicking the active mark undoes it. */
  const mark = (row: ScanAuditRow, correct: boolean) => {
    const label = labels[row.emailId];
    const undo = Boolean(label?.reviewed && label.correct === correct);
    setLabel(row.emailId, {
      reviewed: !undo,
      correct: undo ? undefined : correct,
      reviewedAt: new Date().toISOString(),
      ...(undo ? {} : { eventType: label?.eventType ?? effectiveEventType(row) ?? undefined }),
    });
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
    setImported({ data: parsed, explicit: true });
    saveImportedAudit(parsed);
    setLabels((current) => ({ ...current, ...parsed.labels }));
    setView('pending');
    showSuccess(t('settings.emailScan.audit.importSuccess', { count: parsed.rows.length }));
  };

  const discardImport = () => {
    setImported(null);
    saveImportedAudit(null);
  };

  const runLocalPass = () => {
    setLocal({ source, result: reclassifyRowsLocally(source) });
  };

  const importButton = (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        onChange={handleFile}
        className="hidden"
        aria-label={t('settings.emailScan.audit.importJson')}
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

  if (source.length === 0) {
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
              count: imported.data.rows.length,
              date: imported.data.exportedAt?.split('T')[0] ?? '—',
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
            onClick={() =>
              download(`jajat_scan_labels_${stamp}.json`, toAuditJson(source, labels), 'application/json')
            }
          >
            {t('settings.emailScan.audit.exportJson')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              download(`jajat_scan_labels_${stamp}.csv`, toAuditCsv(source, labels), 'text/csv')
            }
          >
            {t('settings.emailScan.audit.exportCsv')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={runLocalPass}
            data-testid="audit-local"
          >
            {t('settings.emailScan.audit.reclassify')}
          </Button>
          {!imported && importButton}
        </div>
      </div>

      {activeLocal && (
        <p className="text-xs text-muted-foreground" data-testid="audit-local-summary">
          {t('settings.emailScan.audit.localSummary', {
            agree: activeLocal.agree,
            total: activeLocal.total,
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
              {visible.map((row) => (
                <EmailScanAuditRow
                  key={row.emailId}
                  row={row}
                  label={labels[row.emailId] ?? {}}
                  local={activeLocal?.results.get(row.emailId) ?? null}
                  hasLocal={Boolean(activeLocal)}
                  onLabel={(patch) => setLabel(row.emailId, patch)}
                  onCorrectField={(patch) => correctField(row.emailId, patch)}
                  onMark={(correct) => mark(row, correct)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
