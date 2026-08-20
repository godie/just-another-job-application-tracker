import { create } from 'zustand';

import type {
  FollowUpTask,
  NetworkContact,
  NetworkingWorkspace,
} from '../types/networking';
import { generateId } from '../utils/id';
import {
  createEmptyNetworkingWorkspace,
  getNetworkingWorkspace,
  saveNetworkingWorkspace,
} from '../storage/networking';

interface NetworkingState extends NetworkingWorkspace {
  load: () => void;
  addContact: (contact: Omit<NetworkContact, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addFollowUpTask: (
    task: Omit<FollowUpTask, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>
  ) => void;
  completeFollowUp: (id: string) => void;
  getDueTasks: (now: string) => FollowUpTask[];
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

  getDueTasks: (now) => {
    const { followUpTasks } = get();
    return followUpTasks
      .filter((task) => !task.completedAt && task.dueAt <= now)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  },
}));
