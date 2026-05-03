import { create } from 'zustand';
import { setLoginStatus } from '../storage/auth';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  loginWithGoogle as apiLoginWithGoogle,
  loginWithLinkedIn as apiLoginWithLinkedIn,
  fetchMe as apiFetchMe,
  type AuthUser,
} from '../utils/api';

interface AuthState {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setUser: (user: AuthUser | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  loginWithGoogle: (googleToken: string) => Promise<void>;
  loginWithLinkedIn: (code: string, redirectUri: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),
  setError: (error) => set({ error }),
  setLoading: (loading) => set({ isLoading: loading }),

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiLogin(email, password);
      if (response.success && response.user) {
        set({ currentUser: response.user, isAuthenticated: true });
        setLoginStatus(true);
      } else {
        set({ error: response.error || 'Login failed' });
        throw new Error(response.error || 'Login failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email: string, password: string, displayName?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiRegister(email, password, displayName);
      if (response.success && response.user) {
        set({ currentUser: response.user, isAuthenticated: true });
        setLoginStatus(true);
      } else {
        set({ error: response.error || 'Registration failed' });
        throw new Error(response.error || 'Registration failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithGoogle: async (googleToken: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiLoginWithGoogle(googleToken);
      if (response.success && response.user) {
        set({ currentUser: response.user, isAuthenticated: true });
        setLoginStatus(true);
      } else {
        set({ error: response.error || 'Google login failed' });
        throw new Error(response.error || 'Google login failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google login failed';
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithLinkedIn: async (code: string, redirectUri: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiLoginWithLinkedIn(code, redirectUri);
      if (response.success && response.user) {
        set({ currentUser: response.user, isAuthenticated: true });
        setLoginStatus(true);
      } else {
        set({ error: response.error || 'LinkedIn login failed' });
        throw new Error(response.error || 'LinkedIn login failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'LinkedIn login failed';
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiLogout();
      set({ currentUser: null, isAuthenticated: false });
      setLoginStatus(false);
    } catch (err) {
      console.error('Logout failed', err);
      set({ currentUser: null, isAuthenticated: false });
      setLoginStatus(false);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const response = await apiFetchMe();
      if (response.success && response.isAuthenticated && response.user) {
        set({ currentUser: response.user, isAuthenticated: true });
        setLoginStatus(true);
      } else {
        set({ currentUser: null, isAuthenticated: false });
        setLoginStatus(false);
      }
    } catch {
      set({ currentUser: null, isAuthenticated: false });
      setLoginStatus(false);
    } finally {
      set({ isLoading: false });
    }
  },
}));