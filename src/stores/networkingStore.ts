import { create } from 'zustand';

import type {
  ContactLink,
  FollowUpTask,
  NetworkContact,
  NetworkInteraction,
  NetworkingWorkspace,
  Referral,
  ResourceType,
} from '../types/networking';
import { generateId } from '../utils/id';
import {
  createEmptyNetworkingWorkspace,
  getNetworkingWorkspace,
  saveNetworkingWorkspace,
} from '../storage/networking';

interface AddContactLinkInput {
  contactId: string;
  resourceType: ResourceType;
  resourceId: string;
}

interface AddReferralInput extends AddContactLinkInput {
  status?: Referral['status'];
}

interface NetworkingState extends NetworkingWorkspace {
  load: () => void;
  addContact: (contact: Omit<NetworkContact, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addInteraction: (interaction: Omit<NetworkInteraction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addFollowUpTask: (
    task: Omit<FollowUpTask, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>
  ) => void;
  completeFollowUp: (id: string) => void;
  addContactLink: (input: AddContactLinkInput) => boolean;
  addReferral: (input: AddReferralInput) => boolean;
  getDueTasks: (now: string) => FollowUpTask[];
  getLinksForContact: (contactId: string) => ContactLink[];
  getReferralsForContact: (contactId: string) => Referral[];
}

const persist = (workspace: NetworkingWorkspace): void => {
  saveNetworkingWorkspace(workspace);
};

export const useNetworkingStore = create<NetworkingState>()((set, get) => ({
  ...createEmptyNetworkingWorkspace(),

  load: () => {
    set(getNetworkingWorkspace());
  },

  addContact: (contact) => {
    const timestamp = new Date().toISOString();
    const newContact: NetworkContact = {
      ...contact,
      id: generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    set((state) => {
      const workspace = { ...state, contacts: [...state.contacts, newContact] };
      persist(workspace);
      return workspace;
    });
  },

  addFollowUpTask: (task) => {
    const timestamp = new Date().toISOString();
    const newTask: FollowUpTask = {
      ...task,
      id: generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    set((state) => {
      const workspace = { ...state, followUpTasks: [...state.followUpTasks, newTask] };
      persist(workspace);
      return workspace;
    });
  },

  addInteraction: (interaction) => {
    const timestamp = new Date().toISOString();
    const newInteraction: NetworkInteraction = {
      ...interaction,
      id: generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    set((state) => {
      const workspace = { ...state, interactions: [...state.interactions, newInteraction] };
      persist(workspace);
      return workspace;
    });
  },

  completeFollowUp: (id) => {
    set((state) => {
      const timestamp = new Date().toISOString();
      const followUpTasks = state.followUpTasks.map((task) =>
        task.id === id
          ? { ...task, completedAt: task.completedAt ?? timestamp, updatedAt: timestamp }
          : task
      );
      const workspace = { ...state, followUpTasks };
      persist(workspace);
      return workspace;
    });
  },

  addContactLink: ({ contactId, resourceType, resourceId }) => {
    const { contactLinks } = get();
    const isDuplicate = contactLinks.some(
      (link) =>
        link.contactId === contactId &&
        link.resourceType === resourceType &&
        link.resourceId === resourceId,
    );
    if (isDuplicate) return false;

    const timestamp = new Date().toISOString();
    const newLink: ContactLink = {
      id: generateId(),
      contactId,
      resourceType,
      resourceId,
      createdAt: timestamp,
    };
    set((state) => {
      const workspace = { ...state, contactLinks: [...state.contactLinks, newLink] };
      persist(workspace);
      return workspace;
    });
    return true;
  },

  addReferral: ({ contactId, resourceType, resourceId, status = 'requested' }) => {
    const { referrals } = get();
    const isDuplicate = referrals.some(
      (ref) =>
        ref.contactId === contactId &&
        ref.resourceType === resourceType &&
        ref.resourceId === resourceId,
    );
    if (isDuplicate) return false;

    const timestamp = new Date().toISOString();
    const newReferral: Referral = {
      id: generateId(),
      contactId,
      resourceType,
      resourceId,
      status,
      requestedAt: timestamp,
      notes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => {
      const workspace = { ...state, referrals: [...state.referrals, newReferral] };
      persist(workspace);
      return workspace;
    });
    return true;
  },

  getDueTasks: (now) => {
    const { followUpTasks } = get();
    return followUpTasks
      .filter((task) => !task.completedAt && task.dueAt <= now)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  },

  getLinksForContact: (contactId) =>
    get().contactLinks.filter((link) => link.contactId === contactId),

  getReferralsForContact: (contactId) =>
    get().referrals.filter((referral) => referral.contactId === contactId),
}));
