import type { ScanAuditRow } from '../mails/types';
import type { EmailEventType } from './emailClassification';

/**
 * Hand labels for the emails a scan looked at.
 *
 * The audit table shows what the pipeline decided next to the raw email so a
 * human can correct it. The exported dataset (JSON or CSV) is what tunes the
 * classifier afterwards: the corrected rows become examples in the criteria
 * and the untouched ones a test set for calibrating the confidence gates.
 */

export interface AuditLabel {
  eventType?: EmailEventType;
  position?: string;
  company?: string;
  note?: string;
  reviewed?: boolean;
}

export type AuditLabels = Record<string, AuditLabel>;

const STORAGE_KEY = 'emailScanAuditLabels';

export function loadAuditLabels(): AuditLabels {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as AuditLabels) : {};
  } catch {
    return {};
  }
}

export function saveAuditLabels(labels: AuditLabels): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
  } catch (error) {
    console.error('Error saving audit labels:', error);
  }
}

export function updateAuditLabel(
  labels: AuditLabels,
  emailId: string,
  patch: Partial<AuditLabel>,
): AuditLabels {
  return { ...labels, [emailId]: { ...labels[emailId], ...patch } };
}

export interface AuditDatasetRow {
  emailId: string;
  subject: string;
  from: string;
  date: string;
  body: string;
  pipeline: {
    eventType: EmailEventType | null;
    confidence: number | null;
    verdict: string | null;
    position: string | null;
    company: string | null;
    outcome: ScanAuditRow['outcome'];
    matchedApplicationId: string | null;
  };
  label: AuditLabel;
}

export function buildAuditDataset(rows: ScanAuditRow[], labels: AuditLabels): AuditDatasetRow[] {
  return rows.map((row) => ({
    emailId: row.emailId,
    subject: row.subject,
    from: row.from,
    date: row.date,
    body: row.body,
    pipeline: {
      eventType: row.classification?.type ?? null,
      confidence: row.classification?.confidence ?? null,
      verdict: row.classification?.verdict ?? null,
      position: row.extraction.position ?? null,
      company: row.extraction.company ?? null,
      outcome: row.outcome,
      matchedApplicationId: row.matchedApplicationId ?? null,
    },
    label: labels[row.emailId] ?? {},
  }));
}

/** A row counts as corrected when the label disagrees with the pipeline. */
export function isCorrected(row: ScanAuditRow, label: AuditLabel | undefined): boolean {
  if (!label) return false;
  const typeChanged = label.eventType !== undefined && label.eventType !== row.classification?.type;
  const positionChanged =
    label.position !== undefined &&
    label.position !== '' &&
    label.position !== (row.extraction.position ?? '');
  const companyChanged =
    label.company !== undefined &&
    label.company !== '' &&
    label.company !== (row.extraction.company ?? '');
  return typeChanged || positionChanged || companyChanged;
}

export interface AuditStats {
  total: number;
  reviewed: number;
  corrected: number;
}

export function auditStats(rows: ScanAuditRow[], labels: AuditLabels): AuditStats {
  let reviewed = 0;
  let corrected = 0;
  for (const row of rows) {
    const label = labels[row.emailId];
    if (label?.reviewed) reviewed++;
    if (isCorrected(row, label)) corrected++;
  }
  return { total: rows.length, reviewed, corrected };
}

export function toAuditJson(rows: ScanAuditRow[], labels: AuditLabels): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      stats: auditStats(rows, labels),
      rows: buildAuditDataset(rows, labels),
    },
    null,
    2,
  );
}

const CSV_COLUMNS = [
  'emailId',
  'subject',
  'from',
  'date',
  'pipeline_eventType',
  'pipeline_confidence',
  'pipeline_position',
  'pipeline_company',
  'outcome',
  'matchedApplicationId',
  'label_eventType',
  'label_position',
  'label_company',
  'label_reviewed',
  'label_note',
  'body',
] as const;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function toAuditCsv(rows: ScanAuditRow[], labels: AuditLabels): string {
  const dataset = buildAuditDataset(rows, labels);
  const lines = [CSV_COLUMNS.join(',')];

  for (const row of dataset) {
    lines.push(
      [
        row.emailId,
        row.subject,
        row.from,
        row.date,
        row.pipeline.eventType,
        row.pipeline.confidence,
        row.pipeline.position,
        row.pipeline.company,
        row.pipeline.outcome,
        row.pipeline.matchedApplicationId,
        row.label.eventType,
        row.label.position,
        row.label.company,
        row.label.reviewed ? 'yes' : '',
        row.label.note,
        row.body,
      ]
        .map(csvCell)
        .join(','),
    );
  }

  return lines.join('\n');
}
