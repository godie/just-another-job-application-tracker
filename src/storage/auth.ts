// src/storage/auth.ts

const SKIP_AUTH_COOKIE = 'jajat_skip_auth_modal';
const COOKIE_EXPIRY_DAYS = 365;

/**
 * Set cookie to skip auth modal for a year
 */
export function setSkipAuthModal(): void {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + COOKIE_EXPIRY_DAYS);
  document.cookie = `${SKIP_AUTH_COOKIE}=1;expires=${expiry.toUTCString()};path=/;SameSite=Lax`;
}

