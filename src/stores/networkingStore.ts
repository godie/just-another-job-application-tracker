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
  validateContactInput,
  validateInteractionInput,
  validateFollowUpTaskInput,
  validateContactLinkInput,
  validateReferralInput,
} from '../utils/networkingSchemas';
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
  workspaceSnapshot: () => NetworkingWorkspace;
  setWorkspace: (workspace: NetworkingWorkspace) => void;
  /** Returns an error message on invalid input, undefined on success. */
  addContact: (contact: Omit<NetworkContact, 'id' | 'createdAt' | 'updatedAt'>) => string | undefined;
  addInteraction: (interaction: Omit<NetworkInteraction, 'id' | 'createdAt' | 'updatedAt'>) => string | undefined;
  addFollowUpTask: (
    task: Omit<FollowUpTask, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>
  ) => string | undefined;
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

  // Snapshot of the full workspace for the cloud push — mirrors the shape
  // the server expects (Task 1 envelope, schemaVersion included).
  workspaceSnapshot: () => ({
    schemaVersion: 1,
    contacts: get().contacts,
    interactions: get().interactions,
    followUpTasks: get().followUpTasks,
    contactLinks: get().contactLinks,
    referrals: get().referrals,
  }),

  // Replace the whole workspace from a trusted source (cloud pull). Persists
  // like setApplications does — the pulled data becomes the local state —
  // which also dispatches `jobNetworkingUpdated` so open listeners refresh.
  setWorkspace: (workspace) => {
    set(workspace);
    saveNetworkingWorkspace(workspace);
  },

  addContact: (contact) => {
    const timestamp = new Date().toISOString();
    const newContact: NetworkContact = {
      ...contact,
      id: generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const check = validateContactInput(newContact);
    if (!check.ok) {
      console.warn('[networkingStore] rejecting contact:', check.error);
      return check.error;
    }

    set((state) => {
      const workspace = { ...state, contacts: [...state.contacts, newContact] };
      persist(workspace);
      return workspace;
    });
    return undefined;
  },

  addFollowUpTask: (task) => {
    const timestamp = new Date().toISOString();
    const newTask: FollowUpTask = {
      ...task,
      id: generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const check = validateFollowUpTaskInput(newTask);
    if (!check.ok) {
      console.warn('[networkingStore] rejecting followUpTask:', check.error);
      return check.error;
    }

    set((state) => {
      const workspace = { ...state, followUpTasks: [...state.followUpTasks, newTask] };
      persist(workspace);
      return workspace;
    });
    return undefined;
  },

  addInteraction: (interaction) => {
    const timestamp = new Date().toISOString();
    const newInteraction: NetworkInteraction = {
      ...interaction,
      id: generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const check = validateInteractionInput(newInteraction);
    if (!check.ok) {
      console.warn('[networkingStore] rejecting interaction:', check.error);
      return check.error;
    }

    set((state) => {
      const workspace = { ...state, interactions: [...state.interactions, newInteraction] };
      persist(workspace);
      return workspace;
    });
    return undefined;
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
    const check = validateContactLinkInput(newLink);
    if (!check.ok) {
      console.warn('[networkingStore] rejecting contactLink:', check.error);
      return false;
    }
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
    const check = validateReferralInput(newReferral);
    if (!check.ok) {
      console.warn('[networkingStore] rejecting referral:', check.error);
      return false;
    }
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
