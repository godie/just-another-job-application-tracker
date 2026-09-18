import { EmailAdapter } from '../adapter/emailAdapter';
import type { Email, ScanAuditRow } from '../types';
import type { EmailEventType } from '../../utils/emailClassification';

const adapter = new EmailAdapter();

export interface LocalClassification {
  type: EmailEventType;
  company?: string;
  position?: string;
}

/**
 * The keyless baseline: what the keyword cascade alone reads from one audited
 * email. Comparing it with the snapshot (or with the reviewer's label) shows
 * how much of a scan survives without the model service, which is the number
 * that decides whether a full-local run is viable.
 */
export function reclassifyRowLocally(row: ScanAuditRow): LocalClassification | null {
  const email: Email = {
    id: row.emailId,
    subject: row.subject,
    from: row.from,
    body: row.body,
    date: row.date,
  };
  const event = adapter.classify(email);
  if (!event) return null;
  return {
    type: event.type,
    ...(event.company ? { company: event.company } : {}),
    ...(event.position ? { position: event.position } : {}),
  };
}

export interface LocalReclassification {
  results: Map<string, LocalClassification | null>;
  /** Rows where the local type matches the type the pipeline used. */
  agree: number;
  total: number;
}

/** The keyless baseline for a whole set of audited emails. */
export function reclassifyRowsLocally(rows: ScanAuditRow[]): LocalReclassification {
  const results = new Map<string, LocalClassification | null>();
  let agree = 0;
  for (const row of rows) {
    const local = reclassifyRowLocally(row);
    results.set(row.emailId, local);
    const snapshot = row.effectiveEvent?.type ?? row.classification?.type ?? null;
    if ((local?.type ?? null) === snapshot) agree++;
  }
  return { results, agree, total: rows.length };
}
