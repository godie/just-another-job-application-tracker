import type { ScanAuditRow } from '../mails/types';
import { EMAIL_EVENT_TYPES, type EmailEventType } from './emailClassification';

/**
 * Hand labels for the emails a scan looked at.
 *
 * The audit table shows what the pipeline decided next to the raw email so a
 * human can correct it. The exported dataset (JSON or CSV) is what tunes the
 * classifier afterwards: the corrected rows become examples in the criteria
 * and the untouched ones a test set for calibrating the confidence gates.
 */

/**
 * Rejections are not one thing: the first two kinds never reached a human,
 * the third did. The distinction is what makes a rejection informative (a
 * rejection after an interview is a different signal from a cold one).
 */
export type RejectionKind = 'other_candidates' | 'position_filled' | 'after_interview';

export const REJECTION_KINDS: readonly RejectionKind[] = [
  'other_candidates',
  'position_filled',
  'after_interview',
];

export interface AuditLabel {
  eventType?: EmailEventType;
  /** Only meaningful when the labelled event type is `rejected`. */
  rejectionKind?: RejectionKind;
  position?: string;
  company?: string;
  note?: string;
  reviewed?: boolean;
  /**
   * Explicit reviewer verdict: `true` when the pipeline got the row right.
   * Left undefined for rows labelled before this flag existed, where
   * `isCorrected` falls back to comparing fields.
   */
  correct?: boolean;
  /** When the reviewer last set `reviewed`; orders the reviewed list. */
  reviewedAt?: string;
}

export type AuditLabels = Record<string, AuditLabel>;

const STORAGE_KEY = 'emailScanAuditLabels';
const IMPORT_KEY = 'emailScanAuditImport';

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

/**
 * What went wrong with a labelled row, derived so the UI stays a plain table.
 * `missed` and `falsePositive` are the two directions of a type error; the
 * distinction is what tells a classifier problem from a coverage problem.
 */
export interface AuditDiagnosis {
  /** Both saw a work event but disagreed on which. */
  typeWrong: boolean;
  /** Right type, wrong position or company. */
  fieldsWrong: boolean;
  /** The pipeline saw no work event and the reviewer did. */
  missed: boolean;
  /** The pipeline saw a work event and the reviewer did not. */
  falsePositive: boolean;
  /** The email carried no body, so the pipeline could not have read it. */
  insufficient: boolean;
}

export interface AuditDatasetRow {
  emailId: string;
  subject: string;
  from: string;
  date: string;
  body: string;
  pipeline: {
    /** The event the pipeline acted on (`rule` cascade or the judgment). */
    eventType: EmailEventType | null;
    /** Who decided that type: the keyword cascade or the judgment. */
    source: 'rule' | 'judgment' | null;
    /** What the judgment thought, even when the event came from the cascade. */
    classifiedEventType: EmailEventType | null;
    confidence: number | null;
    verdict: string | null;
    position: string | null;
    company: string | null;
    outcome: ScanAuditRow['outcome'];
    matchedApplicationId: string | null;
  };
  label: AuditLabel;
}


export interface AuditImport {
  /** When the file was exported, shown in the banner. */
  exportedAt?: string;
  rows: ScanAuditRow[];
  labels: AuditLabels;
}

const OUTCOMES: readonly ScanAuditRow['outcome'][] = ['addition', 'update', 'skipped', 'no_event'];
const VERDICTS: readonly NonNullable<ScanAuditRow['classification']>['verdict'][] = [
  'auto',
  'review',
  'none',
];

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

function asEventType(value: unknown): EmailEventType | null {
  return typeof value === 'string' && (EMAIL_EVENT_TYPES as readonly string[]).includes(value)
    ? (value as EmailEventType)
    : null;
}

/**
 * Rebuilds one audit row from an exported file. The export carries every
 * `ScanAuditRow` field, so this is the inverse of `buildAuditDataset`; files
 * written before `effectiveEvent` existed only carry the judgment's type, and
 * the rule-only rows they lost stay lost (that is the bug this field fixes).
 */
function toScanAuditRow(entry: unknown): ScanAuditRow | null {
  if (!entry || typeof entry !== 'object') return null;
  const record = entry as Record<string, unknown>;
  const emailId = asString(record.emailId);
  if (!emailId) return null;

  const pipeline = (record.pipeline ?? {}) as Record<string, unknown>;
  const confidence = typeof pipeline.confidence === 'number' ? pipeline.confidence : 0;
  const verdict = VERDICTS.find((value) => value === pipeline.verdict);
  const classified = asEventType(pipeline.classifiedEventType);
  const effective = asEventType(pipeline.eventType);
  const classification: NonNullable<ScanAuditRow['classification']> | null =
    classified && verdict ? { type: classified, confidence, verdict } : null;
  const source = pipeline.source === 'rule' ? 'rule' : 'judgment';

  const extraction = (record.extraction ?? {}) as Record<string, unknown>;
  const position = asString(extraction.position);
  const company = asString(extraction.company);

  return {
    emailId,
    subject: asString(record.subject),
    from: asString(record.from),
    date: asString(record.date),
    body: asString(record.body),
    classification,
    effectiveEvent: effective ? { type: effective, source } : null,
    extraction: {
      ...(position ? { position } : {}),
      ...(company ? { company } : {}),
    },
    outcome: OUTCOMES.find((value) => value === pipeline.outcome) ?? 'skipped',
    ...(asString(pipeline.matchedApplicationId)
      ? { matchedApplicationId: asString(pipeline.matchedApplicationId) }
      : {}),
  };
}

/**
 * Parses an export back into a review session, so a long labelling pass can
 * survive a reload or move between machines without re-scanning. Accepts the
 * `{ rows: [...] }` shape and a bare array; returns null when the file carries
 * no usable row.
 */
export function parseAuditImport(text: string): AuditImport | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const raw = Array.isArray(parsed) ? parsed : (parsed as { rows?: unknown } | null)?.rows;
  if (!Array.isArray(raw)) return null;

  const rows: ScanAuditRow[] = [];
  const labels: AuditLabels = {};
  for (const entry of raw) {
    const row = toScanAuditRow(entry);
    if (!row) continue;
    rows.push(row);
    const label = (entry as { label?: unknown }).label;
    if (label && typeof label === 'object' && hasAuditLabel(label as AuditLabel)) {
      labels[row.emailId] = label as AuditLabel;
    }
  }
  if (rows.length === 0) return null;

  const exportedAt = !Array.isArray(parsed)
    ? asString((parsed as { exportedAt?: unknown }).exportedAt)
    : '';
  return { ...(exportedAt ? { exportedAt } : {}), rows, labels };
}

export function loadImportedAudit(): AuditImport | null {
  try {
    const raw = localStorage.getItem(IMPORT_KEY);
    return raw ? parseAuditImport(raw) : null;
  } catch {
    return null;
  }
}

export function saveImportedAudit(imported: AuditImport | null): void {
  try {
    if (!imported) {
      localStorage.removeItem(IMPORT_KEY);
      return;
    }
    // Every row, labelled or not: the reviewer is resuming where they left
    // off. `toAuditJson` would drop the pending ones.
    const snapshot = {
      ...(imported.exportedAt ? { exportedAt: imported.exportedAt } : {}),
      rows: buildAuditDataset(imported.rows, imported.labels),
    };
    localStorage.setItem(IMPORT_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.error('Error saving imported audit rows:', error);
  }
}

export function buildAuditDataset(rows: ScanAuditRow[], labels: AuditLabels): AuditDatasetRow[] {
  return rows.map((row) => ({
    emailId: row.emailId,
    subject: row.subject,
    from: row.from,
    date: row.date,
    body: row.body,
    pipeline: {
      eventType: row.effectiveEvent?.type ?? row.classification?.type ?? null,
      source: row.effectiveEvent?.source ?? null,
      classifiedEventType: row.classification?.type ?? null,
      confidence: row.classification?.confidence ?? null,
      verdict: row.classification?.verdict ?? null,
      position: row.extraction.position ?? null,
      company: row.extraction.company ?? null,
      outcome: row.outcome,
      matchedApplicationId: row.matchedApplicationId ?? null,
    },
    label: labels[row.emailId] ?? {},
    diagnosis: diagnoseRow(row, labels[row.emailId]),
  }));
}

const NO_WORK_EVENT = [null, 'other'];

/**
 * Derives what went wrong from the label and the pipeline record. Only the
 * four type/field outcomes are derived; a duplicate or a wrong match needs the
 * whole scan to judge, so those stay in the reviewer's note.
 */
export function diagnoseRow(row: ScanAuditRow, label: AuditLabel | undefined): AuditDiagnosis | null {
  if (!label || !hasAuditLabel(label)) return null;
  const pipelineType = effectiveEventType(row);
  const labelledType = label.eventType ?? null;
  const pipelineHadWorkEvent = !NO_WORK_EVENT.includes(pipelineType);
  const labelHasWorkEvent = !NO_WORK_EVENT.includes(labelledType);

  const positionChanged =
    label.position !== undefined &&
    label.position !== '' &&
    label.position !== (row.extraction.position ?? '');
  const companyChanged =
    label.company !== undefined &&
    label.company !== '' &&
    label.company !== (row.extraction.company ?? '');

  return {
    typeWrong: pipelineHadWorkEvent && labelHasWorkEvent && pipelineType !== labelledType,
    fieldsWrong: positionChanged || companyChanged,
    missed: !pipelineHadWorkEvent && labelHasWorkEvent,
    falsePositive: pipelineHadWorkEvent && !labelHasWorkEvent && labelledType !== null,
    insufficient: row.body.trim() === '' && pipelineType === null && labelledType !== null,
  };
}

/** The event type the pipeline used, falling back to the judgment's opinion. */
export function effectiveEventType(row: ScanAuditRow): EmailEventType | null {
  return row.effectiveEvent?.type ?? row.classification?.type ?? null;
}

/**
 * A row counts as corrected when the label disagrees with the pipeline. An
 * explicit `correct` marker wins: the inferred diff is a fallback for labels
 * written before the reviewer could mark a row correct, and it is fooled by
 * spacing or spelling differences the reviewer typed by hand.
 */
export function isCorrected(row: ScanAuditRow, label: AuditLabel | undefined): boolean {
  if (!label) return false;
  if (label.correct !== undefined) return !label.correct;
  const typeChanged = label.eventType !== undefined && label.eventType !== effectiveEventType(row);
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
  /** Every email the scan looked at. */
  total: number;
  /** Rows carrying any label, which is what the exports contain. */
  labelled: number;
  reviewed: number;
  /** Reviewed rows the reviewer marked as correctly classified. */
  correct: number;
  corrected: number;
}

/** A row counts as labelled once it carries any decision from the reviewer. */
export function hasAuditLabel(label: AuditLabel | undefined): boolean {
  if (!label) return false;
  return Boolean(
    label.reviewed ||
      label.eventType ||
      label.rejectionKind ||
      label.position ||
      label.company ||
      label.note,
  );
}

export function pendingRows(rows: ScanAuditRow[], labels: AuditLabels): ScanAuditRow[] {
  return rows.filter((row) => !labels[row.emailId]?.reviewed);
}

/** Newest review first, so the row just reviewed is at the top. */
export function reviewedRows(rows: ScanAuditRow[], labels: AuditLabels): ScanAuditRow[] {
  return rows
    .filter((row) => labels[row.emailId]?.reviewed)
    .sort((a, b) =>
      (labels[b.emailId]?.reviewedAt ?? '').localeCompare(labels[a.emailId]?.reviewedAt ?? ''),
    );
}

export function labelledRows(rows: ScanAuditRow[], labels: AuditLabels): ScanAuditRow[] {
  return rows.filter((row) => hasAuditLabel(labels[row.emailId]));
}

export function auditStats(rows: ScanAuditRow[], labels: AuditLabels): AuditStats {
  let labelled = 0;
  let reviewed = 0;
  let correct = 0;
  let corrected = 0;
  for (const row of rows) {
    const label = labels[row.emailId];
    if (hasAuditLabel(label)) labelled++;
    if (label?.reviewed) reviewed++;
    if (label?.correct === true) correct++;
    if (isCorrected(row, label)) corrected++;
  }
  return { total: rows.length, labelled, reviewed, correct, corrected };
}

/**
 * Exports carry only the rows the reviewer has labelled: a scan can look at
 * hundreds of emails and shipping the untouched ones just adds noise to the
 * dataset. `scannedTotal` keeps the context of how many were seen.
 */
export function toAuditJson(rows: ScanAuditRow[], labels: AuditLabels): string {
  const labelled = labelledRows(rows, labels);
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      scannedTotal: rows.length,
      stats: auditStats(labelled, labels),
      rows: buildAuditDataset(labelled, labels),
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
  'pipeline_source',
  'pipeline_classifiedEventType',
  'pipeline_confidence',
  'pipeline_position',
  'pipeline_company',
  'outcome',
  'matchedApplicationId',
  'label_eventType',
  'label_rejectionKind',
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
  const dataset = buildAuditDataset(labelledRows(rows, labels), labels);
  const lines = [CSV_COLUMNS.join(',')];

  for (const row of dataset) {
    lines.push(
      [
        row.emailId,
        row.subject,
        row.from,
        row.date,
        row.pipeline.eventType,
        row.pipeline.source,
        row.pipeline.classifiedEventType,
        row.pipeline.confidence,
        row.pipeline.position,
        row.pipeline.company,
        row.pipeline.outcome,
        row.pipeline.matchedApplicationId,
        row.label.eventType,
        row.label.rejectionKind,
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
