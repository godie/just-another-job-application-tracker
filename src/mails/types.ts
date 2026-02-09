import type { JobApplication, InterviewEvent } from '../types/applications';

export interface RawEmail {
  id: string;
  headers: Record<string, string>;
  body: string;
  /** Gmail-style internal date (ms). */
  internalDate?: string;
  /** ISO date string (preferred by normalize). */
  date?: string;
}

export interface Email {
  id: string;
  subject: string;
  from: string;
  to?: string;
  body: string;
  date: string; // ISO
}

export interface ParsedEvent {
  id: string;
  type: 'application_submitted'|'next_steps'|'rejected'|'offer'|'other';
  date: string;
  company?: string;
  position?: string;
  notes?: string;
}

export interface Event {
  id: string;
  type: 'application_submitted'|'next_steps'|'rejected'|'offer'|'other';
  date: string;
  company?: string;
  position?: string;
  notes?: string;
}


const NO_PROMOTIONS_AND_SOCIAL_MEDIA = `-category:promotions -category:social`;
export const QUERIES = {
  
  application_submitted: (daysBack: number = 30) =>
    `in:inbox newer_than:${daysBack}d -in:chats ${NO_PROMOTIONS_AND_SOCIAL_MEDIA} (
      "thank you for applying" OR
      "thanks for applying" OR
      "application received" OR
      "we received your application" OR
      "your application for"
    )`,

  applications_rejected: (daysBack: number = 30) =>
    `in:inbox newer_than:${daysBack}d -in:chats ${NO_PROMOTIONS_AND_SOCIAL_MEDIA} (
      "regret to inform" OR
      "we regret" OR
      "unfortunately" OR
      "not moving forward" OR
      "decided to move forward with other candidates" OR
      "will not be moving forward"
    )`,

  application_next_steps: (daysBack: number = 30) =>
    `in:inbox newer_than:${daysBack}d -in:chats ${NO_PROMOTIONS_AND_SOCIAL_MEDIA} (
      "interview invitation" OR
      "schedule an interview" OR
      "schedule a call" OR
      "availability" OR
      "book time" OR
      "next steps"
    )`,
} as const;


export interface EmailProvider {
  search(query: string): Promise<string[]>; // devuelve IDs
  getMessage(id: string): Promise<RawEmail>;
  normalize(raw: RawEmail): Email;
}

/** One proposed new application from a "application submitted" email (for manual review). */
export interface ProposedAddition {
  id: string;
  data: Omit<JobApplication, 'id'>;
  source: { subject: string; date: string };
}

/** One proposed timeline event to add to an existing application (for manual review). */
export interface ProposedUpdate {
  id: string;
  applicationId: string;
  company: string;
  position: string;
  newEvent: InterviewEvent;
  source: { subject: string; date: string };
}

/** Result of scan without applying: user can review and then apply selected. */
export interface ScanPreview {
  proposedAdditions: ProposedAddition[];
  proposedUpdates: ProposedUpdate[];
}

/** Result of applying selected additions/updates. */
export interface ApplyResult {
  added: number;
  updated: number;
}
