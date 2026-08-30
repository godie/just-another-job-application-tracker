import { z } from 'zod';

import {
  parseContactLinks,
  parseContacts,
  parseFollowUpTasks,
  parseInteractions,
  parseReferrals,
} from './networkingSchemas';
import type { NetworkingWorkspace } from '../types/networking';

/* -------------------------------------------------------------------------- */
/*  Networking cloud-sync boundary hardening.                                 */
/*                                                                           */
/*  Threat model: GET /api/sync/networking returns rows owned by the        */
/*  calling user, but the response is still attacker-influenced —           */
/*  compromised server, MITM, or stale cache. We treat every entry as       */
/*  untrusted: the same per-entity schemas as the local read path apply.    */
/* -------------------------------------------------------------------------- */

const MAX_ENTITIES = 10000; // matches the local read-path cap in networkingSchemas.ts

const workspaceEnvelopeSchema = z.object({
  success: z.boolean(),
  schemaVersion: z.number().int().min(1),
  contacts: z.array(z.unknown()).max(MAX_ENTITIES),
  interactions: z.array(z.unknown()).max(MAX_ENTITIES),
  followUpTasks: z.array(z.unknown()).max(MAX_ENTITIES),
  contactLinks: z.array(z.unknown()).max(MAX_ENTITIES),
  referrals: z.array(z.unknown()).max(MAX_ENTITIES),
});

export interface NetworkingSyncParseResult {
  workspace: NetworkingWorkspace | null;
  envelopeError: string | null;
  dropped: number;
}

/**
 * Parse a GET /api/sync/networking response. Returns `workspace: null` with
 * an `envelopeError` when the envelope itself is unusable (non-object,
 * missing keys, wrong types, over-cap arrays). Rows inside a valid envelope
 * are re-validated with the same per-entity schemas as the local read path;
 * invalid rows are dropped (counted in `dropped`) while valid siblings
 * survive — identical drop semantics to the local read path.
 */
export function parseNetworkingSyncResponse(raw: unknown): NetworkingSyncParseResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { workspace: null, envelopeError: 'response is not an object', dropped: 0 };
  }

  const envelope = workspaceEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    return { workspace: null, envelopeError: 'invalid workspace envelope', dropped: 0 };
  }

  if (envelope.data.schemaVersion !== 1) {
    return { workspace: null, envelopeError: `unsupported schemaVersion ${envelope.data.schemaVersion}`, dropped: 0 };
  }

  // Reuse the exact per-entity parsers from the local read path so the cloud
  // payload can never be more permissive than local storage.
  return {
    workspace: {
      schemaVersion: 1,
      contacts: parseContacts(envelope.data.contacts),
      interactions: parseInteractions(envelope.data.interactions),
      followUpTasks: parseFollowUpTasks(envelope.data.followUpTasks),
      contactLinks: parseContactLinks(envelope.data.contactLinks),
      referrals: parseReferrals(envelope.data.referrals),
    },
    envelopeError: null,
    dropped: countDropped(envelope.data, {
      contacts: parseContacts(envelope.data.contacts),
      interactions: parseInteractions(envelope.data.interactions),
      followUpTasks: parseFollowUpTasks(envelope.data.followUpTasks),
      contactLinks: parseContactLinks(envelope.data.contactLinks),
      referrals: parseReferrals(envelope.data.referrals),
    }),
  };
}

function countDropped(
  envelope: z.infer<typeof workspaceEnvelopeSchema>,
  parsed: Omit<NetworkingWorkspace, 'schemaVersion'>,
): number {
  const keys = ['contacts', 'interactions', 'followUpTasks', 'contactLinks', 'referrals'] as const;
  let dropped = 0;
  for (const key of keys) {
    dropped += envelope[key].length - parsed[key].length;
  }
  return dropped;
}
