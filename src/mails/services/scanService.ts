import type { EmailProvider } from '../providers/emailProvider';
import type { RawEmail, Email } from '../types';
import type { ScanPreview, ScanAuditRow, ProposedAddition, ProposedUpdate, ApplyResult } from '../types';
import type { JobApplication } from '../../types/applications';

import { EmailAdapter } from '../adapter/emailAdapter';
import { QUERIES, QUERIES_ES } from '../types';
import { useApplicationsStore } from '../../stores/applicationsStore';
import { matchEmailToApplication } from '../../utils/applicationMatch';
import { classifyEmailsWithJudgment } from '../../utils/emailClassification';

const GMAIL_CHUNK_SIZE = 5;
const GMAIL_CHUNK_DELAY_MS = 150;

/**
 * Upper bound on AI judgments per scan. Only emails whose company is not
 * already matched reach the judgment, and each one costs a request; the cap
 * keeps a mailbox full of odd senders from turning one scan into dozens of
 * calls. Emails past the cap keep the deterministic behaviour (dropped).
 */
const MAX_JUDGMENTS_PER_SCAN = 10;

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
  // Build chunks first to avoid await-in-loop
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += GMAIL_CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + GMAIL_CHUNK_SIZE));
  }

  // Process chunks sequentially with rate-limiting via reduce + .then() chain
  async function processChunk(results: RawEmail[], chunk: string[], index: number): Promise<RawEmail[]> {
    const chunkResults = await Promise.all(
      chunk.map((id) => provider.getMessage(id))
    );
    results.push(...chunkResults);
    if (index < chunks.length - 1) {
      await delay(GMAIL_CHUNK_DELAY_MS);
    }
    return results;
  }

  return chunks.reduce(
    (promise, chunk, index) => promise.then((results) => processChunk(results, chunk, index)),
    Promise.resolve<RawEmail[]>([])
  );
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
  const audit: ScanAuditRow[] = [];
  let judgmentsUsed = 0;

  const appByCompany = new Map<string, JobApplication>();
  for (const a of applications) {
    const key = (a.company ?? '').toLowerCase();
    if (key) appByCompany.set(key, a);
  }

  // One batched classification request for the whole scan: the keyword
  // cascade in `classify()` misses wording it has no rule for, and the
  // judgment answers what the email actually is. An empty map (service
  // unavailable, no key) leaves the keyword result in place.
  const classifications = await classifyEmailsWithJudgment(emails);

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const classification = classifications.get(i);
    const base: Omit<ScanAuditRow, 'outcome'> = {
      emailId: email.id,
      subject: email.subject,
      from: email.from,
      date: email.date,
      body: email.body,
      classification: classification?.type
        ? {
            type: classification.type,
            confidence: classification.confidence,
            verdict: classification.verdict,
          }
        : null,
      extraction: {},
    };

    if (classification?.type === 'other' && classification.verdict === 'auto') {
      audit.push({ ...base, outcome: 'skipped' }); // job alert, newsletter
      continue;
    }

    let event = adapter.classify(email);
    if (!event) {
      // The keyword cascade found no rule; a confident judgment can still say
      // what the email is. Only the type is known here — `company`/`position`
      // stay undefined and the application match below resolves the target.
      // A confirmation without an extractable company would only produce an
      // "Unknown" addition, so it keeps the previous behaviour (dropped).
      if (
        !classification?.type ||
        classification.type === 'other' ||
        classification.type === 'application_submitted'
      ) {
        audit.push({ ...base, outcome: 'no_event' });
        continue;
      }
      event = {
        id: crypto.randomUUID(),
        type: classification.type,
        date: email.date,
        notes: email.subject,
      };
    } else if (classification?.type) {
      event.type = classification.type;
    }
    const needsReview = classification?.verdict === 'review';
    const extraction = { position: event.position, company: event.company };

    if (event.type === 'application_submitted') {
      const company = event.company?.toLowerCase();
      const existing = company ? appByCompany.get(company) : undefined;
      if (!existing) {
        proposedAdditions.push({
          id: `add-${event.id}`,
          data: adapter.applicationFromEvent(event),
          source: { subject: email.subject, date: email.date },
        });
        audit.push({ ...base, extraction, outcome: 'addition' });
      } else {
        audit.push({
          ...base,
          extraction,
          outcome: 'skipped',
          matchedApplicationId: existing.id,
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
          needsReview: needsReview || undefined,
        });
        audit.push({ ...base, extraction, outcome: 'update', matchedApplicationId: app.id });
      } else if (judgmentsUsed < MAX_JUDGMENTS_PER_SCAN) {
        // Company names vary ("ACME, Inc." vs "Acme") and a classified email
        // may carry no company at all; ask a judgment instead of dropping the
        // update. `null` (service unavailable) and low confidence keep the
        // previous behaviour.
        judgmentsUsed++;
        const decision = await matchEmailToApplication(
          { subject: email.subject, from: email.from, body: email.body },
          applications,
        );
        const matched = decision?.applicationId
          ? applications.find((candidate) => candidate.id === decision.applicationId)
          : undefined;
        if (matched) {
          proposedUpdates.push({
            id: `update-${matched.id}-${event.id}`,
            applicationId: matched.id,
            company: matched.company,
            position: matched.position,
            newEvent: adapter.eventToInterviewEvent(event),
            source: { subject: email.subject, date: email.date },
            needsReview: needsReview || (decision?.verdict === 'review'),
          });
          audit.push({
            ...base,
            extraction,
            outcome: 'update',
            matchedApplicationId: matched.id,
          });
        } else {
          audit.push({ ...base, extraction, outcome: 'skipped' });
        }
      } else {
        audit.push({ ...base, extraction, outcome: 'skipped' });
      }
    }
  }

  return { proposedAdditions, proposedUpdates, emails, audit };
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

