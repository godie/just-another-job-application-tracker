import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getNetworkingWorkspace,
  saveNetworkingWorkspace,
} from './networking';
import type { NetworkingWorkspace } from '../types/networking';
import { NETWORKING_STORAGE_KEY } from '../utils/constants';

const emptyWorkspace: NetworkingWorkspace = {
  schemaVersion: 1,
  contacts: [],
  interactions: [],
  followUpTasks: [],
  contactLinks: [],
  referrals: [],
};

describe('networking storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty versioned workspace when no data exists', () => {
    expect(getNetworkingWorkspace()).toEqual(emptyWorkspace);
  });

  it('returns an empty workspace when stored JSON is malformed', () => {
    localStorage.setItem(NETWORKING_STORAGE_KEY, '{not-json');

    expect(getNetworkingWorkspace()).toEqual(emptyWorkspace);
  });

  it('migrates a legacy workspace without schemaVersion to version 1', () => {
    localStorage.setItem(
      NETWORKING_STORAGE_KEY,
      JSON.stringify({
        contacts: [{
          id: 'contact-1',
          name: '<strong>Ada</strong>',
          relationshipType: 'other',
          tags: [],
          notes: '',
          createdAt: '2026-08-20T10:00:00.000Z',
          updatedAt: '2026-08-20T10:00:00.000Z',
        }],
        
        interactions: [],
        followUpTasks: [],
        contactLinks: [],
        referrals: [],
      }),
    );

    expect(getNetworkingWorkspace()).toEqual({
      ...emptyWorkspace,
      contacts: [{
        id: 'contact-1',
        name: 'Ada',
        relationshipType: 'other',
        tags: [],
        notes: '',
        createdAt: '2026-08-20T10:00:00.000Z',
        updatedAt: '2026-08-20T10:00:00.000Z',
      }],
    });
  });

  it('sanitizes persisted user text and dispatches one same-tab update event', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    saveNetworkingWorkspace({
      ...emptyWorkspace,
      contacts: [{
        id: 'contact-1',
        name: '<img src=x onerror=alert(1)>Ada',
        relationshipType: 'other',
        tags: [],
        notes: '',
        createdAt: '2026-08-20T10:00:00.000Z',
        updatedAt: '2026-08-20T10:00:00.000Z',
      }],
    });

    expect(getNetworkingWorkspace().contacts[0]?.name).toBe('Ada');
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'jobNetworkingUpdated' }),
    );

    dispatchSpy.mockRestore();
  });

  it('drops invalid entities and keeps valid siblings when reading', () => {
    localStorage.setItem(
      NETWORKING_STORAGE_KEY,
      JSON.stringify({
        contacts: [
          {
            id: 'good',
            name: 'Grace Hopper',
            relationshipType: 'peer',
            tags: [],
            notes: '',
            createdAt: '2026-08-20T10:00:00.000Z',
            updatedAt: '2026-08-20T10:00:00.000Z',
          },
          {
            id: 'bad',
            name: '',
            relationshipType: 'martian',
            tags: [],
            notes: '',
            createdAt: '2026-08-20T10:00:00.000Z',
            updatedAt: '2026-08-20T10:00:00.000Z',
          },
        ],
        interactions: [],
        followUpTasks: [],
        contactLinks: [],
        referrals: [],
      }),
    );

    expect(getNetworkingWorkspace().contacts.map((c) => c.id)).toEqual(['good']);
  });
});
