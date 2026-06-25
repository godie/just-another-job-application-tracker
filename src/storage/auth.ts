
const SKIP_AUTH_STORAGE_KEY = 'jajat_skip_auth_modal';

export function setSkipAuthModal(): void {
  localStorage.setItem(SKIP_AUTH_STORAGE_KEY, '1');
}
