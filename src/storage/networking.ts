import type { NetworkingWorkspace } from '../types/networking';
import { NETWORKING_STORAGE_KEY } from '../utils/constants';
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

const toWorkspace = (value: unknown): NetworkingWorkspace => {
  if (!isRecord(value)) return createEmptyNetworkingWorkspace();

  const sanitized = sanitizeObject(value);
  if (sanitized.schemaVersion !== undefined && sanitized.schemaVersion !== 1) {
    return createEmptyNetworkingWorkspace();
  }

  return {
    schemaVersion: 1,
    contacts: Array.isArray(sanitized.contacts) ? sanitized.contacts : [],
    interactions: Array.isArray(sanitized.interactions) ? sanitized.interactions : [],
    followUpTasks: Array.isArray(sanitized.followUpTasks) ? sanitized.followUpTasks : [],
    contactLinks: Array.isArray(sanitized.contactLinks) ? sanitized.contactLinks : [],
    referrals: Array.isArray(sanitized.referrals) ? sanitized.referrals : [],
  } as NetworkingWorkspace;
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
    const sanitized = sanitizeObject(workspace as unknown as Record<string, unknown>);
    localStorage.setItem(NETWORKING_STORAGE_KEY, JSON.stringify(sanitized));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jobNetworkingUpdated'));
    }
  } catch (error) {
    console.error('Error saving networking data to localStorage:', error);
  }
};
