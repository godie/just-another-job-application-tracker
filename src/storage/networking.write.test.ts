import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getNetworkingWorkspace,
  saveNetworkingWorkspace,
} from './networking';
import type {
  ContactLink,
  FollowUpTask,
  NetworkInteraction,
  NetworkingWorkspace,
  Referral,
} from '../types/networking';
import { NETWORKING_STORAGE_KEY } from '../utils/constants';

const ts = '2026-08-20T10:00:00.000Z';

const validContact = {
  id: 'contact-good',
  name: 'Grace Hopper',
  company: 'Navy',
  role: 'CTO',
  email: 'grace@example.com',
  phone: undefined,
  linkedinUrl: undefined,
  location: undefined,
  relationshipType: 'peer' as const,
  tags: ['engineer'],
  notes: 'modern computing',
  createdAt: ts,
  updatedAt: ts,
};

const validInteraction: NetworkInteraction = {
  id: 'interaction-good',
  contactId: 'contact-good',
  occurredAt: ts,
  channel: 'email',
  summary: 'intro chat',
  notes: '',
  status: 'completed',
  createdAt: ts,
  updatedAt: ts,
};

const validFollowUp: FollowUpTask = {
  id: 'task-good',
  contactId: 'contact-good',
  title: 'Send intro',
  dueAt: ts,
  completedAt: undefined,
  createdAt: ts,
  updatedAt: ts,
};

const validLink: ContactLink = {
  id: 'link-good',
  contactId: 'contact-good',
  resourceType: 'application',
  resourceId: 'app-1',
  createdAt: ts,
};

const validReferral: Referral = {
  id: 'referral-good',
  contactId: 'contact-good',
  resourceType: 'application',
  resourceId: 'app-1',
  status: 'requested',
  requestedAt: ts,
  notes: '',
  createdAt: ts,
  updatedAt: ts,
};

const workspace = (overrides: Partial<NetworkingWorkspace> = {}): NetworkingWorkspace => ({
  schemaVersion: 1,
  contacts: [],
  interactions: [],
  followUpTasks: [],
  contactLinks: [],
  referrals: [],
  ...overrides,
});

const readPersisted = (): Record<string, unknown> | null => {
  const raw = localStorage.getItem(NETWORKING_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
};

describe('networking storage write path', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips a fully valid workspace identically (no entities dropped)', () => {
    const input = workspace({
      contacts: [validContact],
      interactions: [validInteraction],
      followUpTasks: [validFollowUp],
      contactLinks: [validLink],
      referrals: [validReferral],
    });

    saveNetworkingWorkspace(input);

    expect(getNetworkingWorkspace()).toEqual(input);
  });

  it('drops a contact with an invalid relationshipType on write — verified at the storage layer', () => {
    // The assertion is on the raw persisted payload, NOT on the read filter.
    // Without write-path validation, the bad row would still be in localStorage
    // even though getNetworkingWorkspace() (read filter) would mask it.
    const bad = { ...validContact, id: 'contact-bad', relationshipType: 'martian' as unknown as 'peer' };

    saveNetworkingWorkspace(workspace({ contacts: [bad, validContact] }));

    const persisted = readPersisted();
    const ids = (persisted?.['contacts'] as Array<{ id: string }> | undefined)?.map((c) => c.id);
    expect(ids).toEqual(['contact-good']);
  });

  it('drops an interaction with an invalid channel on write — verified at the storage layer', () => {
    const badInteraction = { ...validInteraction, id: 'interaction-bad', channel: 'carrier_pigeon' as unknown as 'email' };

    saveNetworkingWorkspace(workspace({
      contacts: [validContact],
      interactions: [badInteraction, validInteraction],
    }));

    const persisted = readPersisted();
    const ids = (persisted?.['interactions'] as Array<{ id: string }> | undefined)?.map((i) => i.id);
    expect(ids).toEqual(['interaction-good']);
  });

  it('drops a follow-up with a malformed dueAt on write — verified at the storage layer', () => {
    const badTask = { ...validFollowUp, id: 'task-bad', dueAt: 'tomorrow' };

    saveNetworkingWorkspace(workspace({
      contacts: [validContact],
      followUpTasks: [badTask, validFollowUp],
    }));

    const persisted = readPersisted();
    const ids = (persisted?.['followUpTasks'] as Array<{ id: string }> | undefined)?.map((t) => t.id);
    expect(ids).toEqual(['task-good']);
  });

  it('drops a contact link with a non-allowlisted resourceType on write — verified at the storage layer', () => {
    const badLink = { ...validLink, id: 'link-bad', resourceType: 'resume' as unknown as 'application' };

    saveNetworkingWorkspace(workspace({
      contacts: [validContact],
      contactLinks: [badLink, validLink],
    }));

    const persisted = readPersisted();
    const ids = (persisted?.['contactLinks'] as Array<{ id: string }> | undefined)?.map((l) => l.id);
    expect(ids).toEqual(['link-good']);
  });

  it('drops a referral with a non-allowlisted status on write — verified at the storage layer', () => {
    const badReferral = { ...validReferral, id: 'referral-bad', status: 'ghosted' as unknown as 'requested' };

    saveNetworkingWorkspace(workspace({
      contacts: [validContact],
      referrals: [badReferral, validReferral],
    }));

    const persisted = readPersisted();
    const ids = (persisted?.['referrals'] as Array<{ id: string }> | undefined)?.map((r) => r.id);
    expect(ids).toEqual(['referral-good']);
  });

  it('persists nothing readable when the workspace schemaVersion is not 1', () => {
    saveNetworkingWorkspace({
      schemaVersion: 2 as unknown as 1,
      contacts: [validContact],
      interactions: [],
      followUpTasks: [],
      contactLinks: [],
      referrals: [],
    });

    expect(getNetworkingWorkspace()).toEqual(workspace());
  });

  it('still dispatches one jobNetworkingUpdated event after a drop-laden write', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    saveNetworkingWorkspace(workspace({
      contacts: [
        { ...validContact, id: 'contact-bad', relationshipType: 'martian' as unknown as 'peer' },
        validContact,
      ],
    }));

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'jobNetworkingUpdated' }),
    );

    dispatchSpy.mockRestore();
  });

  it('writes the sanitized payload, not the raw input (round-trip body equals parser output)', () => {
    saveNetworkingWorkspace(workspace({
      contacts: [validContact],
    }));

    const raw = localStorage.getItem(NETWORKING_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw ?? '{}');
    expect(parsed.contacts[0]).toEqual(validContact);
  });
});
