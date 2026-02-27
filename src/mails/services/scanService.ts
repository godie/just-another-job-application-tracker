import type { EmailProvider } from '../providers/emailProvider';
import type { RawEmail } from '../types';
import type { ScanPreview, ProposedAddition, ProposedUpdate, ApplyResult } from '../types';

import { EmailAdapter } from '../adapter/emailAdapter';
import { QUERIES } from '../types';
import { useApplicationsStore } from '../../stores/applicationsStore';

/** Max concurrent getMessage requests to avoid Gmail "Too many concurrent requests" (429). */
const GMAIL_CHUNK_SIZE = 5;
/** Delay in ms between chunks to stay under rate limits. */
const GMAIL_CHUNK_DELAY_MS = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches messages in chunks to avoid Gmail 429 (too many concurrent requests).
 * Stops and rethrows on first error (e.g. GmailRateLimitError).
 */
async function fetchMessagesInChunks(
  provider: EmailProvider,
  ids: string[]
): Promise<RawEmail[]> {
  const results: RawEmail[] = [];
  for (let i = 0; i < ids.length; i += GMAIL_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + GMAIL_CHUNK_SIZE);
    const chunkResults = await Promise.all(
      chunk.map((id) => provider.getMessage(id))
    );
    results.push(...chunkResults);
    if (i + chunk.length < ids.length) {
      await delay(GMAIL_CHUNK_DELAY_MS);
    }
  }
  return results;
}

/** @deprecated Use scanEmails + applyScanPreview for manual flow. Kept for future automatic flow. */
export interface ScanResult {
  totalEvents: number;
  added: number;
  updated: number;
}

/**
 * Scans the email provider and returns proposed additions/updates for the user to review.
 * Does not modify the store.
 * Fetches messages in chunks to avoid Gmail "Too many concurrent requests" (429).
 */
export async function scanEmails(provider: EmailProvider, daysBack: number = 30): Promise<ScanPreview> {
  const adapter = new EmailAdapter();
  const { applications } = useApplicationsStore.getState();

  const idsByQuery = await Promise.all(
    Object.values(QUERIES).map((q) => provider.search(q(daysBack) as string))
  );
  const uniqueIds = [...new Set(idsByQuery.flat())];

  const rawMessages = await fetchMessagesInChunks(provider, uniqueIds);
  const emails = rawMessages.map((r) => provider.normalize(r));
  console.log("Emails: " + JSON.stringify(emails, null, 2));

  const proposedAdditions: ProposedAddition[] = [];
  const proposedUpdates: ProposedUpdate[] = [];

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const event = adapter.classify(email);
    if (!event) continue;

    if (event.type === 'application_submitted') {
      const company = event.company?.toLowerCase();
      const exists = applications.some((a) =>
        (a.company ?? '').toLowerCase().includes(company ?? '')
      );
      if (!exists) {
        proposedAdditions.push({
          id: `add-${event.id}`,
          data: adapter.applicationFromEvent(event),
          source: { subject: email.subject, date: email.date },
        });
      }
    } else {
      const company = event.company?.toLowerCase();
      const app = applications.find((a) =>
        (a.company ?? '').toLowerCase().includes(company ?? '')
      );
      if (app) {
        proposedUpdates.push({
          id: `update-${app.id}-${event.id}`,
          applicationId: app.id,
          company: app.company,
          position: app.position,
          newEvent: adapter.eventToInterviewEvent(event),
          source: { subject: email.subject, date: email.date },
        });
      }
    }
  }

  return { proposedAdditions, proposedUpdates, emails };
}

/**
 * Applies the selected proposed additions and updates to the store.
 */
export function applyScanPreview(
  additions: ProposedAddition[],
  updates: ProposedUpdate[]
): ApplyResult {
  const { addApplication, updateApplication } =
    useApplicationsStore.getState();

  let added = 0;
  for (const a of additions) {
    addApplication(a.data);
    added++;
  }

  let updated = 0;
  for (const u of updates) {
    const applications = useApplicationsStore.getState().applications;
    const app = applications.find((ap) => ap.id === u.applicationId);
    if (app) {
      const newTimeline = [...app.timeline, u.newEvent];
      updateApplication(u.applicationId, { timeline: newTimeline });
      updated++;
    }
  }

  return { added, updated };
}

/**
 * Automatic flow: scan and apply all without review.
 * @deprecated Prefer manual flow (scanEmails + user review + applyScanPreview).
 */
export async function scanEmailsAndApply(provider: EmailProvider): Promise<ScanResult> {
  const preview = await scanEmails(provider);
  const result = applyScanPreview(preview.proposedAdditions, preview.proposedUpdates);
  return {
    totalEvents: preview.proposedAdditions.length + preview.proposedUpdates.length,
    added: result.added,
    updated: result.updated,
  };
}
