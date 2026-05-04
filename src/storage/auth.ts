// src/storage/auth.ts

const SKIP_AUTH_COOKIE = 'jajat_skip_auth_modal';
const COOKIE_EXPIRY_DAYS = 365;

/**
 * Simula la verificación de login.
 * En un proyecto real, esto verificaría un token JWT o una sesión.
 */
export const checkLoginStatus = (): boolean => {
  return localStorage.getItem('isLoggedIn') === 'true';
};

/**
 * Simula el login/logout (se usará como placeholder).
 */
export const setLoginStatus = (status: boolean): void => {
  if (status) {
    localStorage.setItem('isLoggedIn', 'true');
  } else {
    localStorage.removeItem('isLoggedIn');
  }
};

/**
 * Set cookie to skip auth modal for a year
 */
export function setSkipAuthModal(): void {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + COOKIE_EXPIRY_DAYS);
  document.cookie = `${SKIP_AUTH_COOKIE}=1;expires=${expiry.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Check if should skip auth modal
 */
export function shouldSkipAuthModal(): boolean {
  return document.cookie.includes(`${SKIP_AUTH_COOKIE}=1`);
}

/**
 * Clear the skip auth modal cookie
 */
export function clearSkipAuthModal(): void {
  document.cookie = `${SKIP_AUTH_COOKIE}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}