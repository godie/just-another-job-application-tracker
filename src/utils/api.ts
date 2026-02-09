// src/utils/api.ts

/**
 * API utility functions for backend communication (Laravel API).
 * Handles secure cookie operations: set, get, clear.
 * Use VITE_API_BASE_URL (e.g. http://localhost:8080/api) when backend is on another origin.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const defaultFetchOptions: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

/**
 * Set authentication cookie in backend (POST /api/auth/cookie).
 * Prefer setAuthCookieWithCode so the server can store a refresh token.
 *
 * @param accessToken - Google OAuth access token (legacy; no refresh)
 * @returns Promise with response data
 */
export const setAuthCookie = async (accessToken: string): Promise<{ success: boolean }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/cookie`, {
      ...defaultFetchOptions,
      method: 'POST',
      body: JSON.stringify({ access_token: accessToken }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? `Failed to set auth cookie: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error setting auth cookie:', error);
    throw error;
  }
};

/**
 * Exchange authorization code for tokens and set auth cookies (includes refresh token).
 * Use with useGoogleLogin({ flow: 'auth-code', onSuccess: (res) => setAuthCookieWithCode(res.code) }).
 *
 * @param code - Authorization code from Google
 * @param redirectUri - Same redirect_uri used in the auth request (e.g. window.location.origin)
 * @returns Promise with response data
 */
export const setAuthCookieWithCode = async (
  code: string,
  redirectUri: string
): Promise<{ success: boolean; expires_in?: number }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/cookie`, {
      ...defaultFetchOptions,
      method: 'POST',
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error((data as { error?: string }).error ?? `Failed to set auth cookie: ${response.statusText}`);
    }

    return data as { success: boolean; expires_in?: number };
  } catch (error) {
    console.error('Error setting auth cookie with code:', error);
    throw error;
  }
};

/**
 * Clear authentication cookie (logout). Laravel DELETE /api/auth/cookie.
 * @returns Promise with response data
 */
export const clearAuthCookie = async (): Promise<{ success: boolean }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/cookie`, {
      ...defaultFetchOptions,
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to clear auth cookie: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error clearing auth cookie:', error);
    throw error;
  }
};

/**
 * Get authentication cookie from backend (GET /api/auth/cookie).
 * Server may refresh the access token from refresh_token if expired.
 * Requires credentials so the HTTP-only cookie is sent.
 * On 401/404 returns { success: false } so callers can prompt login.
 *
 * @returns Promise with { success, access_token? }; do not throw on 401/404
 */
export const getAuthCookie = async (): Promise<{
  success: boolean;
  access_token?: string;
  error?: string;
  message?: string;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/cookie`, {
      ...defaultFetchOptions,
      method: 'GET',
    });

    const data = (await response.json().catch(() => ({}))) as {
      success: boolean;
      access_token?: string;
      error?: string;
      message?: string;
    };

    if (response.ok) {
      return data;
    }
    if (response.status === 401 || response.status === 404) {
      return { ...data, success: false };
    }
    throw new Error((data as { error?: string }).error ?? `Failed to get auth cookie: ${response.statusText}`);
  } catch (error) {
    console.error('Error getting auth cookie:', error);
    throw error;
  }
};
