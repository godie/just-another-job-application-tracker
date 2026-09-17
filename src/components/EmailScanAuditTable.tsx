import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScanAuditRow } from '../mails/types';
import { EMAIL_EVENT_TYPES, type EmailEventType } from '../utils/emailClassification';
import {
  auditStats,
  loadAuditLabels,
  saveAuditLabels,
  toAuditCsv,
  toAuditJson,
  updateAuditLabel,
  type AuditLabels,
} from '../utils/scanAudit';
import { Button } from './ui/Button';

interface EmailScanAuditTableProps {
  rows: ScanAuditRow[];
}

const OUTCOME_CLASSES: Record<ScanAuditRow['outcome'], string> = {
  addition: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  update: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  skipped: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
  no_event: 'bg-muted text-muted-foreground',
};

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
 * pipeline decided, and an editable label per row. Exports the labels as JSON
 * (the dataset used to tune the classifier) or CSV (for a spreadsheet pass).
 */
export const EmailScanAuditTable: React.FC<EmailScanAuditTableProps> = ({ rows }) => {
  const { t } = useTranslation();
  const [labels, setLabels] = useState<AuditLabels>(() => loadAuditLabels());

  useEffect(() => {
    saveAuditLabels(labels);
  }, [labels]);

  const stats = useMemo(() => auditStats(rows, labels), [rows, labels]);

  const setLabel = (emailId: string, patch: Parameters<typeof updateAuditLabel>[2]) => {
    setLabels((current) => updateAuditLabel(current, emailId, patch));
  };

  const stamp = new Date().toISOString().split('T')[0];

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6" data-testid="audit-empty">
        {t('settings.emailScan.audit.noRows')}
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="audit-table">
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
              corrected: stats.corrected,
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => download(`jajat_scan_labels_${stamp}.json`, toAuditJson(rows, labels), 'application/json')}
          >
            {t('settings.emailScan.audit.exportJson')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => download(`jajat_scan_labels_${stamp}.csv`, toAuditCsv(rows, labels), 'text/csv')}
          >
            {t('settings.emailScan.audit.exportCsv')}
          </Button>
        </div>
      </div>

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
            {rows.map((row) => {
              const label = labels[row.emailId] ?? {};
              const effectiveType = label.eventType ?? row.classification?.type ?? '';
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
                    <p className="text-xs text-muted-foreground mt-1">
                      {row.classification
                        ? `${row.classification.type} · ${row.classification.confidence.toFixed(2)}`
                        : t('settings.emailScan.audit.noClassification')}
                    </p>
                    <p className="text-xs text-foreground mt-1">
                      {row.extraction.position ?? t('settings.emailScan.audit.unknown')}
                      <span className="text-muted-foreground"> @ </span>
                      {row.extraction.company ?? t('settings.emailScan.audit.unknown')}
                    </p>
                  </td>
                  <td className="p-2">
                    <div className="flex flex-col gap-2 min-w-48">
                      <label className="text-xs text-muted-foreground">
                        {t('settings.emailScan.audit.fields.eventType')}
                        <select
                          value={effectiveType}
                          aria-label={`${t('settings.emailScan.audit.fields.eventType')} — ${row.subject}`}
                          onChange={(event) =>
                            setLabel(row.emailId, {
                              eventType: (event.target.value || undefined) as EmailEventType | undefined,
                              reviewed: true,
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
                          onChange={(event) => setLabel(row.emailId, { position: event.target.value })}
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
                          onChange={(event) => setLabel(row.emailId, { company: event.target.value })}
                          className="mt-1 w-full text-xs rounded border border-border bg-background text-foreground p-1.5"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={label.reviewed ?? false}
                          aria-label={`${t('settings.emailScan.audit.fields.reviewed')} — ${row.subject}`}
                          onChange={(event) =>
                            setLabel(row.emailId, {
                              reviewed: event.target.checked,
                              eventType: label.eventType ?? row.classification?.type,
                            })
                          }
                        />
                        {t('settings.emailScan.audit.fields.reviewed')}
                      </label>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

