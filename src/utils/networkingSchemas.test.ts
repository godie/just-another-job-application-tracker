import { describe, expect, it } from 'vitest';

import {
  parseContacts,
  parseContactLinks,
  parseFollowUpTasks,
  parseInteractions,
  parseReferrals,
} from './networkingSchemas';

const ts = '2026-08-20T10:00:00.000Z';

const validContact = {
  id: 'contact-1',
  name: 'Ada Lovelace',
  relationshipType: 'mentor',
  tags: ['engineer'],
  notes: '',
  createdAt: ts,
  updatedAt: ts,
};

describe('networkingSchemas', () => {
  it('passes a valid contact through unchanged', () => {
    expect(parseContacts([validContact])).toEqual([validContact]);
  });

  it('drops a contact with a non-allowlisted relationship type and keeps siblings', () => {
    const good = { ...validContact, id: 'contact-ok' };
    const bad = { ...validContact, id: 'contact-bad', relationshipType: 'martian' };
    expect(parseContacts([bad, good]).map((c) => c.id)).toEqual(['contact-ok']);
  });

  it('drops a contact whose id fails the regex (proto-pollution / path traversal)', () => {
    expect(parseContacts([{ ...validContact, id: '../etc/passwd' }])).toHaveLength(0);
  });

  it('drops an interaction with a non-allowlisted channel', () => {
    const interaction = {
      id: 'interaction-1',
      contactId: 'contact-1',
      occurredAt: ts,
      channel: 'carrier_pigeon',
      summary: 'hi',
      notes: '',
      status: 'completed',
      createdAt: ts,
      updatedAt: ts,
    };
    expect(parseInteractions([interaction])).toHaveLength(0);
  });

  it('drops a follow-up task with a malformed dueAt', () => {
    const task = {
      id: 'task-1',
      contactId: 'contact-1',
      title: 'Send intro',
      dueAt: 'tomorrow',
      createdAt: ts,
      updatedAt: ts,
    };
    expect(parseFollowUpTasks([task])).toHaveLength(0);
  });

  it('coerces a null completedAt to undefined', () => {
    const task = {
      id: 'task-1',
      contactId: 'contact-1',
      title: 'Send intro',
      dueAt: ts,
      completedAt: null,
      createdAt: ts,
      updatedAt: ts,
    };
    expect(parseFollowUpTasks([task])[0]?.completedAt).toBeUndefined();
  });

  it('drops a contact link with a non-allowlisted resource type', () => {
    const link = {
      id: 'link-1',
      contactId: 'contact-1',
      resourceType: 'resume',
      resourceId: 'app-1',
      createdAt: ts,
    };
    expect(parseContactLinks([link])).toHaveLength(0);
  });

  it('drops a referral with a non-allowlisted status', () => {
    const referral = {
      id: 'referral-1',
      contactId: 'contact-1',
      resourceType: 'application',
      resourceId: 'app-1',
      status: 'ghosted',
      requestedAt: ts,
      notes: '',
      createdAt: ts,
      updatedAt: ts,
    };
    expect(parseReferrals([referral])).toHaveLength(0);
  });

  it('returns an empty array for a non-array input', () => {
    expect(parseContacts(null)).toEqual([]);
    expect(parseContacts({})).toEqual([]);
    expect(parseContacts('nope')).toEqual([]);
  });
});
