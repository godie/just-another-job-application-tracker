import { vi } from 'vitest';

vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useGoogleLogin: vi.fn(),
}));
