import { create } from 'zustand';

interface GeminiKeyState {
  geminiKeyInMemory: string | null;
  isLoading: boolean;
  error: string | null;

  hasKeyInMemory: boolean;

  setDecryptedKey: (key: string) => void;
  clearKeyFromMemory: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useGeminiKeyStore = create<GeminiKeyState>()((set, get) => ({
  geminiKeyInMemory: null,
  isLoading: false,
  error: null,

  get hasKeyInMemory() {
    return get().geminiKeyInMemory !== null;
  },

  setDecryptedKey: (key) => {
    set({ geminiKeyInMemory: key, error: null });
  },

  clearKeyFromMemory: () => {
    set({ geminiKeyInMemory: null });
  },

  setError: (error) => {
    set({ error });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },
}));
