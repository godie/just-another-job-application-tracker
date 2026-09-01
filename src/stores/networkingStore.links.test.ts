import { beforeEach, describe, expect, it } from 'vitest';

import { useNetworkingStore } from './networkingStore';
import { NETWORKING_STORAGE_KEY } from '../utils/constants';
import {
  getNetworkingWorkspace,
} from '../storage/networking';
import type { ResourceType } from '../types/networking';

const baseContact = (overrides = {}) => ({
  name: 'Ada Lovelace',
  relationshipType: 'mentor' as const,
  tags: [],
  notes: '',
  ...overrides,
});

describe('networkingStore — links and referrals', () => {
  beforeEach(() => {
    localStorage.clear();
    useNetworkingStore.getState().load();
  });

  it('addContactLink adds a link and persists it', () => {
    useNetworkingStore.getState().addContact(baseContact());
    const contactId = useNetworkingStore.getState().contacts[0]!.id;

    const added = useNetworkingStore.getState().addContactLink({
      contactId,
      resourceType: 'application' as ResourceType,
      resourceId: 'app-1',
    });

    expect(added).toBe(true);
    const state = useNetworkingStore.getState();
    expect(state.contactLinks).toHaveLength(1);
    expect(state.contactLinks[0]).toMatchObject({
      contactId,
      resourceType: 'application',
      resourceId: 'app-1',
    });

    // Reload from localStorage to confirm persistence.
    useNetworkingStore.getState().load();
    expect(useNetworkingStore.getState().contactLinks).toHaveLength(1);
  });

  it('addContactLink rejects duplicates of (contactId, resourceType, resourceId) and returns false', () => {
    useNetworkingStore.getState().addContact(baseContact());
    const contactId = useNetworkingStore.getState().contacts[0]!.id;

    const first = useNetworkingStore.getState().addContactLink({
      contactId,
      resourceType: 'application' as ResourceType,
      resourceId: 'app-1',
    });
    const second = useNetworkingStore.getState().addContactLink({
      contactId,
      resourceType: 'application' as ResourceType,
      resourceId: 'app-1',
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(useNetworkingStore.getState().contactLinks).toHaveLength(1);
  });

  it('addContactLink accepts two distinct resources for the same contact', () => {
    useNetworkingStore.getState().addContact(baseContact());
    const contactId = useNetworkingStore.getState().contacts[0]!.id;

    useNetworkingStore.getState().addContactLink({
      contactId,
      resourceType: 'application',
      resourceId: 'app-1',
    });
    useNetworkingStore.getState().addContactLink({
      contactId,
      resourceType: 'opportunity',
      resourceId: 'app-2',
    });

    expect(useNetworkingStore.getState().contactLinks).toHaveLength(2);
  });

  it('addReferral adds a referral with default status "requested" and persists it', () => {
    useNetworkingStore.getState().addContact(baseContact());
    const contactId = useNetworkingStore.getState().contacts[0]!.id;

    const added = useNetworkingStore.getState().addReferral({
      contactId,
      resourceType: 'application' as ResourceType,
      resourceId: 'app-1',
    });

    expect(added).toBe(true);
    const state = useNetworkingStore.getState();
    expect(state.referrals).toHaveLength(1);
    expect(state.referrals[0]).toMatchObject({
      contactId,
      resourceType: 'application',
      resourceId: 'app-1',
      status: 'requested',
    });

    useNetworkingStore.getState().load();
    expect(getNetworkingWorkspace().referrals[0]?.status).toBe('requested');
  });

  it('addReferral accepts an explicit status and rejects duplicates', () => {
    useNetworkingStore.getState().addContact(baseContact());
    const contactId = useNetworkingStore.getState().contacts[0]!.id;

    const first = useNetworkingStore.getState().addReferral({
      contactId,
      resourceType: 'opportunity' as ResourceType,
      resourceId: 'opp-1',
      status: 'introduced',
    });
    const second = useNetworkingStore.getState().addReferral({
      contactId,
      resourceType: 'opportunity' as ResourceType,
      resourceId: 'opp-1',
      status: 'submitted',
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(useNetworkingStore.getState().referrals).toHaveLength(1);
    expect(useNetworkingStore.getState().referrals[0]?.status).toBe('introduced');
  });

  it('linking and referring the same resource for the same contact are independent collections', () => {
    useNetworkingStore.getState().addContact(baseContact());
    const contactId = useNetworkingStore.getState().contacts[0]!.id;

    useNetworkingStore.getState().addContactLink({
      contactId,
      resourceType: 'application',
      resourceId: 'app-1',
    });
    useNetworkingStore.getState().addReferral({
      contactId,
      resourceType: 'application',
      resourceId: 'app-1',
    });

    expect(useNetworkingStore.getState().contactLinks).toHaveLength(1);
    expect(useNetworkingStore.getState().referrals).toHaveLength(1);
  });

  it('getLinksForContact scopes to the requested contact', () => {
    useNetworkingStore.getState().addContact(baseContact({ name: 'A' }));
    useNetworkingStore.getState().addContact(baseContact({ name: 'B' }));
    const [a, b] = useNetworkingStore.getState().contacts;

    useNetworkingStore.getState().addContactLink({ contactId: a!.id, resourceType: 'application', resourceId: 'app-1' });
    useNetworkingStore.getState().addContactLink({ contactId: a!.id, resourceType: 'application', resourceId: 'app-2' });
    useNetworkingStore.getState().addContactLink({ contactId: b!.id, resourceType: 'application', resourceId: 'app-3' });

    expect(useNetworkingStore.getState().getLinksForContact(a!.id).map((l) => l.resourceId))
      .toEqual(['app-1', 'app-2']);
    expect(useNetworkingStore.getState().getLinksForContact(b!.id).map((l) => l.resourceId))
      .toEqual(['app-3']);
  });

  it('getReferralsForContact scopes to the requested contact', () => {
    useNetworkingStore.getState().addContact(baseContact({ name: 'A' }));
    useNetworkingStore.getState().addContact(baseContact({ name: 'B' }));
    const [a, b] = useNetworkingStore.getState().contacts;

    useNetworkingStore.getState().addReferral({ contactId: a!.id, resourceType: 'application', resourceId: 'app-1' });
    useNetworkingStore.getState().addReferral({ contactId: b!.id, resourceType: 'application', resourceId: 'app-2' });

    expect(useNetworkingStore.getState().getReferralsForContact(a!.id).map((r) => r.resourceId))
      .toEqual(['app-1']);
    expect(useNetworkingStore.getState().getReferralsForContact(b!.id).map((r) => r.resourceId))
      .toEqual(['app-2']);
  });

  it('link and referral artifacts do not surface on raw JSON before reload (store funnel contract)', () => {
    useNetworkingStore.getState().addContact(baseContact());
    const contactId = useNetworkingStore.getState().contacts[0]!.id;
    useNetworkingStore.getState().addContactLink({
      contactId,
      resourceType: 'application',
      resourceId: 'app-1',
    });
    useNetworkingStore.getState().addReferral({
      contactId,
      resourceType: 'application',
      resourceId: 'app-2',
    });

    const raw = localStorage.getItem(NETWORKING_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw ?? '{}') as { contactLinks: Array<{ resourceId: string }>; referrals: Array<{ resourceId: string }> };
    expect(parsed.contactLinks.map((l) => l.resourceId)).toEqual(['app-1']);
    expect(parsed.referrals.map((r) => r.resourceId)).toEqual(['app-2']);
  });
});
