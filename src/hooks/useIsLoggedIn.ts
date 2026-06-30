import { useAuthStore } from '../stores/authStore';

/**
 * This replaces the legacy localStorage-based check with the Zustand
 * auth store so UI always reflects the actual session.
 */
export function useIsLoggedIn(): boolean {
  return useAuthStore((state) => state.isAuthenticated);
}
