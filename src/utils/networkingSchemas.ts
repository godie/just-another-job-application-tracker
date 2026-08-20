import { z } from 'zod';

import type {
  ContactLink,
  FollowUpTask,
  NetworkContact,
  NetworkInteraction,
  Referral,
} from '../types/networking';

/* -------------------------------------------------------------------------- */
/*  Networking local-storage boundary hardening.                              */
/*                                                                           */
/*  `localStorage['jobNetworking']` is user-influenced (tampered storage,    */
/*  stale keys, imported JSON). Each entity is parsed with a strict Zod      */
/*  schema: id regex, strict enums, ISO timestamps, and length caps.         */
/*  Invalid rows are dropped while valid siblings survive, mirroring the     */
/*  `syncSchemas.ts` threat model for the local read path.                   */
/* -------------------------------------------------------------------------- */

const MAX_TEXT = 300;
const MAX_NOTES = 5000;
const MAX_URL = 2048;
const MAX_TAGS = 50;
const MAX_TAG_LEN = 50;
const MAX_ENTITIES = 10000;

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:?\d{2})?)?$/;

// ids are app-generated via utils/id.ts; alphanumeric + dashes + underscores.
const ID_RE = /^[A-Za-z0-9_-]{1,200}$/;

const RELATIONSHIP_TYPES = [
  'recruiter',
  'hiring_manager',
  'referrer',
  'former_colleague',
  'mentor',
  'peer',
  'other',
] as const;

const INTERACTION_CHANNELS = [
  'email',
  'linkedin',
  'phone',
  'video',
  'in_person',
  'event',
  'other',
] as const;

const INTERACTION_STATUSES = ['planned', 'completed'] as const;

const RESOURCE_TYPES = ['application', 'opportunity'] as const;

const REFERRAL_STATUSES = [
  'planned',
  'requested',
  'introduced',
  'submitted',
  'declined',
  'completed',
] as const;

const id = z.string().regex(ID_RE, { message: 'Invalid id format' });
const isoDate = z
  .string()
  .max(50)
  .refine((s) => ISO_DATE_RE.test(s), { message: 'Invalid ISO date' });

const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v == null ? undefined : v), schema.optional());

const optionalText = (max: number) => optional(z.string().max(max));

const networkContactSchema = z.object({
  id,
  name: z.string().trim().min(1).max(MAX_TEXT),
  company: optionalText(MAX_TEXT),
  role: optionalText(MAX_TEXT),
  email: optionalText(MAX_TEXT),
  phone: optionalText(MAX_TEXT),
  linkedinUrl: optionalText(MAX_URL),
  location: optionalText(MAX_TEXT),
  relationshipType: z.enum(RELATIONSHIP_TYPES),
  tags: z.array(z.string().max(MAX_TAG_LEN)).max(MAX_TAGS),
  notes: z.string().max(MAX_NOTES),
  createdAt: isoDate,
  updatedAt: isoDate,
});

const networkInteractionSchema = z.object({
  id,
  contactId: id,
  occurredAt: isoDate,
  channel: z.enum(INTERACTION_CHANNELS),
  summary: z.string().max(MAX_TEXT),
  notes: z.string().max(MAX_NOTES),
  status: z.enum(INTERACTION_STATUSES),
  createdAt: isoDate,
  updatedAt: isoDate,
});

const followUpTaskSchema = z.object({
  id,
  contactId: id,
  title: z.string().trim().min(1).max(MAX_TEXT),
  dueAt: isoDate,
  completedAt: optional(isoDate),
  createdAt: isoDate,
  updatedAt: isoDate,
});

const contactLinkSchema = z.object({
  id,
  contactId: id,
  resourceType: z.enum(RESOURCE_TYPES),
  resourceId: id,
  createdAt: isoDate,
});

const referralSchema = z.object({
  id,
  contactId: id,
  resourceType: z.enum(RESOURCE_TYPES),
  resourceId: id,
  status: z.enum(REFERRAL_STATUSES),
  requestedAt: isoDate,
  notes: z.string().max(MAX_NOTES),
  createdAt: isoDate,
  updatedAt: isoDate,
});

function parseEntityList<T>(raw: unknown, schema: z.ZodType<T>, context: string): T[] {
  if (!Array.isArray(raw)) return [];

  const out: T[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = schema.safeParse(raw[i]);
    if (row.success) {
      out.push(row.data);
    } else {
      console.warn(`[networkingSchemas] dropping ${context}[${i}]`, row.error.issues);
    }
  }

  if (out.length > MAX_ENTITIES) {
    out.length = MAX_ENTITIES;
  }
  return out;
}

export const parseContacts = (raw: unknown): NetworkContact[] =>
  parseEntityList(raw, networkContactSchema, 'contacts');

export const parseInteractions = (raw: unknown): NetworkInteraction[] =>
  parseEntityList(raw, networkInteractionSchema, 'interactions');

export const parseFollowUpTasks = (raw: unknown): FollowUpTask[] =>
  parseEntityList(raw, followUpTaskSchema, 'followUpTasks');

export const parseContactLinks = (raw: unknown): ContactLink[] =>
  parseEntityList(raw, contactLinkSchema, 'contactLinks');

export const parseReferrals = (raw: unknown): Referral[] =>
  parseEntityList(raw, referralSchema, 'referrals');
