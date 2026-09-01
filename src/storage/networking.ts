import type { NetworkingWorkspace } from '../types/networking';
import { NETWORKING_STORAGE_KEY } from '../utils/constants';
import {
  parseContactLinks,
  parseContacts,
  parseFollowUpTasks,
  parseInteractions,
  parseReferrals,
} from '../utils/networkingSchemas';
import { sanitizeObject } from '../utils/url';

export const createEmptyNetworkingWorkspace = (): NetworkingWorkspace => ({
  schemaVersion: 1,
  contacts: [],
  interactions: [],
  followUpTasks: [],
  contactLinks: [],
  referrals: [],
});

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const fromWorkspace = (workspace: NetworkingWorkspace): NetworkingWorkspace => {
  if (workspace.schemaVersion !== 1) return createEmptyNetworkingWorkspace();

  return {
    schemaVersion: 1,
    contacts: parseContacts(workspace.contacts),
    interactions: parseInteractions(workspace.interactions),
    followUpTasks: parseFollowUpTasks(workspace.followUpTasks),
    contactLinks: parseContactLinks(workspace.contactLinks),
    referrals: parseReferrals(workspace.referrals),
  };
};

const toWorkspace = (value: unknown): NetworkingWorkspace => {
  if (!isRecord(value)) return createEmptyNetworkingWorkspace();

  const sanitized = sanitizeObject(value);
  if (sanitized.schemaVersion !== undefined && sanitized.schemaVersion !== 1) {
    return createEmptyNetworkingWorkspace();
  }

  return fromWorkspace({ ...createEmptyNetworkingWorkspace(), ...sanitized } as NetworkingWorkspace);
};

export const getNetworkingWorkspace = (): NetworkingWorkspace => {
  try {
    const data = localStorage.getItem(NETWORKING_STORAGE_KEY);
    if (!data) return createEmptyNetworkingWorkspace();

    return toWorkspace(JSON.parse(data));
  } catch (error) {
    console.error('Error loading networking data from localStorage:', error);
    return createEmptyNetworkingWorkspace();
  }
};

export const saveNetworkingWorkspace = (workspace: NetworkingWorkspace): void => {
  try {
    // Parse-then-sanitize ensures the persisted payload is symmetric with the
    // read path: invalid entities never reach localStorage, only round-trippable
    // ones do. Storage is a defensive boundary (store mutations, content-script
    // bypass writes, future migration scripts, cloud-sync merges) — every
    // writer is filtered through the same Zod schemas as the reader.
    const parsed = fromWorkspace(workspace);
    const sanitized = sanitizeObject(parsed as unknown as Record<string, unknown>);
    localStorage.setItem(NETWORKING_STORAGE_KEY, JSON.stringify(sanitized));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jobNetworkingUpdated'));
    }
  } catch (error) {
    console.error('Error saving networking data to localStorage:', error);
  }
};
