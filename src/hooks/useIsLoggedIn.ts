import { useSyncExternalStore } from 'react';
import { checkLoginStatus } from '../storage/auth';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  // Also poll as a fallback for same-window changes if needed,
  // but usually we can trigger a custom event or just use window.dispatchEvent
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot() {
  return checkLoginStatus();
}

export function useIsLoggedIn() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
