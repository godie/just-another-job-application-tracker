import { useAuthStore } from '../stores/authStore';

/**
 * Returns whether the user is currently authenticated based on the
 * real server-side auth state (fetched from /api/auth/me).
 *
 * This replaces the legacy localStorage-based check with the Zustand
 * auth store so UI always reflects the actual session.
 */
export function useIsLoggedIn(): boolean {
  return useAuthStore((state) => state.isAuthenticated);
}
