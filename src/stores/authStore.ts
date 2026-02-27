import { create } from 'zustand';
import { setLoginStatus } from '../storage/auth';

interface User {
  id: number;
  email: string;
  name?: string;
  picture?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (status: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAuthenticated: (status) => set({ isAuthenticated: status }),
  setError: (error) => set({ error }),

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'DELETE' });
      set({ user: null, isAuthenticated: false });
      setLoginStatus(false);
    } catch {
      // Ignore
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          set({ user: data.user, isAuthenticated: true });
          setLoginStatus(true);
        } else {
          set({ user: null, isAuthenticated: false });
          setLoginStatus(false);
        }
      } else {
        set({ user: null, isAuthenticated: false });
        setLoginStatus(false);
      }
    } catch {
      set({ user: null, isAuthenticated: false });
      setLoginStatus(false);
    } finally {
      set({ isLoading: false });
    }
  },
}));
