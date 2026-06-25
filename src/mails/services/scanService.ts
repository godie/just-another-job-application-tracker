import type { EmailProvider } from '../providers/emailProvider';
import type { RawEmail, Email } from '../types';
import type { ScanPreview, ProposedAddition, ProposedUpdate, ApplyResult } from '../types';
import type { JobApplication } from '../../types/applications';

import { EmailAdapter } from '../adapter/emailAdapter';
import { QUERIES, QUERIES_ES } from '../types';
import { useApplicationsStore } from '../../stores/applicationsStore';

const GMAIL_CHUNK_SIZE = 5;
const GMAIL_CHUNK_DELAY_MS = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Note: The `from` field is compared as-is after normalize(), so consistent
 * formatting is assumed (e.g. always "Name <email>" or always just "email").
 * If normalize() produces different formats for the same sender, dedup may miss.
 */
export function deduplicateEmails(emails: Email[]): Email[] {
  const seen = new Set<string>();
  return emails.filter((email) => {
    const key = `${email.subject.toLowerCase().trim()}|${email.from.toLowerCase().trim()}|${email.date.split('T')[0]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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
      // react-doctor-disable-next-line async-await-in-loop -- rate-limit delay between chunks to avoid Gmail 429. Chunks themselves are fetched in parallel via Promise.all above.
      await delay(GMAIL_CHUNK_DELAY_MS);
    }
  }
  return results;
}


export async function scanEmails(provider: EmailProvider, daysBack: number = 30): Promise<ScanPreview> {
  const adapter = new EmailAdapter();
  const { applications } = useApplicationsStore.getState();

  const idsByQuery = await Promise.all([
    ...Object.values(QUERIES).map((q) => provider.search(q(daysBack) as string)),
    ...Object.values(QUERIES_ES).map((q) => provider.search(q(daysBack) as string)),
  ]);
  const uniqueIds = [...new Set(idsByQuery.flat())];

  const rawMessages = await fetchMessagesInChunks(provider, uniqueIds);
  const emails = deduplicateEmails(rawMessages.map((r) => provider.normalize(r)));

  const proposedAdditions: ProposedAddition[] = [];
  const proposedUpdates: ProposedUpdate[] = [];

  const appByCompany = new Map<string, JobApplication>();
  for (const a of applications) {
    const key = (a.company ?? '').toLowerCase();
    if (key) appByCompany.set(key, a);
  }

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const event = adapter.classify(email);
    if (!event) continue;

    if (event.type === 'application_submitted') {
      const company = event.company?.toLowerCase();
      const exists = company ? appByCompany.has(company) : false;
      if (!exists) {
        proposedAdditions.push({
          id: `add-${event.id}`,
          data: adapter.applicationFromEvent(event),
          source: { subject: email.subject, date: email.date },
        });
      }
    } else {
      const company = event.company?.toLowerCase();
      const app = company ? appByCompany.get(company) : undefined;
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
    const appById = new Map(applications.map((ap) => [ap.id, ap] as const));
    const app = appById.get(u.applicationId);
    if (app) {
      const newTimeline = [...app.timeline, u.newEvent];
      updateApplication(u.applicationId, { timeline: newTimeline });
      updated++;
    }
  }

  return { added, updated };
}

