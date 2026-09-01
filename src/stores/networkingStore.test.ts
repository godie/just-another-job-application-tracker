import { beforeEach, describe, expect, it } from 'vitest';

import { useNetworkingStore } from './networkingStore';
import type { NetworkContact, FollowUpTask } from '../types/networking';

const now = '2026-08-24T00:00:00.000Z';

const contactInput = (overrides: Partial<Omit<NetworkContact, 'id'>> = {}) => ({
  name: 'Ada Lovelace',
  relationshipType: 'mentor' as const,
  tags: [],
  notes: '',
  ...overrides,
});

describe('networkingStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useNetworkingStore.getState().load();
  });

  it('creates one contact and persists it', () => {
    useNetworkingStore.getState().addContact(contactInput());

    const state = useNetworkingStore.getState();
    expect(state.contacts).toHaveLength(1);
    expect(state.contacts[0]?.name).toBe('Ada Lovelace');
    expect(state.contacts[0]?.id).toBeTruthy();

    useNetworkingStore.getState().load();
    expect(useNetworkingStore.getState().contacts).toHaveLength(1);
  });

  it('updates and persists a contact', () => {
    useNetworkingStore.getState().addContact(contactInput());
    const contactId = useNetworkingStore.getState().contacts[0]!.id;

    expect(useNetworkingStore.getState().updateContact(contactId, { name: 'Grace Hopper' })).toBeUndefined();
    expect(useNetworkingStore.getState().contacts[0]?.name).toBe('Grace Hopper');

    useNetworkingStore.getState().load();
    expect(useNetworkingStore.getState().contacts[0]?.name).toBe('Grace Hopper');
  });

  it('rejects invalid contact updates without changing state', () => {
    useNetworkingStore.getState().addContact(contactInput());
    const contactId = useNetworkingStore.getState().contacts[0]!.id;
    const result = useNetworkingStore.getState().updateContact(contactId, { name: '' });

    expect(result).toBeTruthy();
    expect(useNetworkingStore.getState().contacts[0]?.name).toBe('Ada Lovelace');
  });

  it('deletes a contact and cascades related records', () => {
    useNetworkingStore.getState().addContact(contactInput());
    const contactId = useNetworkingStore.getState().contacts[0]!.id;
    useNetworkingStore.getState().addInteraction({
      contactId,
      channel: 'email',
      occurredAt: now,
      summary: 'Hello',
      status: 'completed',
    });
    useNetworkingStore.getState().addFollowUpTask({ contactId, title: 'Follow up', dueAt: now });
    useNetworkingStore.getState().addContactLink({ contactId, resourceType: 'application', resourceId: 'app-1' });
    useNetworkingStore.getState().addReferral({ contactId, resourceType: 'application', resourceId: 'app-2' });

    useNetworkingStore.getState().deleteContact(contactId);

    const state = useNetworkingStore.getState();
    expect(state.contacts).toHaveLength(0);
    expect(state.interactions).toHaveLength(0);
    expect(state.followUpTasks).toHaveLength(0);
    expect(state.contactLinks).toHaveLength(0);
    expect(state.referrals).toHaveLength(0);
  });

  it('marks a follow-up complete without deleting it', () => {
    useNetworkingStore.getState().addContact(contactInput());
    const contactId = useNetworkingStore.getState().contacts[0]!.id;

    useNetworkingStore.getState().addFollowUpTask({
      contactId,
      title: 'Send intro',
      dueAt: '2026-08-21T09:00:00.000Z',
    });
    const taskId = useNetworkingStore.getState().followUpTasks[0]!.id;

    useNetworkingStore.getState().completeFollowUp(taskId);

    const completed = useNetworkingStore.getState().followUpTasks[0];
    expect(completed?.id).toBe(taskId);
    expect(completed?.completedAt).toBeTruthy();

    useNetworkingStore.getState().load();
    expect(useNetworkingStore.getState().followUpTasks).toHaveLength(1);
  });

  it('returns only incomplete tasks ordered by dueAt', () => {
    useNetworkingStore.getState().addContact(contactInput());
    const contactId = useNetworkingStore.getState().contacts[0]!.id;

    const seed: Array<Omit<FollowUpTask, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>> = [
      { contactId, title: 'Later', dueAt: '2026-08-23T09:00:00.000Z' },
      { contactId, title: 'Earliest', dueAt: '2026-08-21T09:00:00.000Z' },
      { contactId, title: 'Middle', dueAt: '2026-08-22T09:00:00.000Z' },
    ];
    for (const task of seed) {
      useNetworkingStore.getState().addFollowUpTask(task);
    }
    const middleId = useNetworkingStore
      .getState()
      .followUpTasks.find((t) => t.title === 'Middle')!.id;
    useNetworkingStore.getState().completeFollowUp(middleId);

    const due = useNetworkingStore.getState().getDueTasks(now);

    expect(due.map((t) => t.title)).toEqual(['Earliest', 'Later']);
  });
});
