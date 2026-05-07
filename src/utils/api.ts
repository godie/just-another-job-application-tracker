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

export interface AuthUser {
  id: number;
  email: string;
  organizationId?: number;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  isPublic: boolean;
  bio?: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  googleId?: string;
  linkedinId?: string;
}

interface AuthResponse {
  success: boolean;
  user?: AuthUser | null;
  message?: string;
  error?: string;
}

interface MeResponse {
  success: boolean;
  user: AuthUser | null;
  isAuthenticated: boolean;
}

export async function register(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    ...defaultFetchOptions,
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  return response.json();
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    ...defaultFetchOptions,
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return response.json();
}

export async function loginWithGoogle(googleToken: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    ...defaultFetchOptions,
    method: 'POST',
    body: JSON.stringify({ googleToken }),
  });
  return response.json();
}

export async function linkGoogleAccount(googleToken: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    ...defaultFetchOptions,
    method: 'POST',
    body: JSON.stringify({ googleToken }),
  });
  return response.json();
}

export async function loginWithLinkedIn(
  code: string,
  redirectUri: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/linkedin`, {
    ...defaultFetchOptions,
    method: 'POST',
    body: JSON.stringify({ code, redirectUri }),
  });
  return response.json();
}

export async function logout(): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    ...defaultFetchOptions,
    method: 'DELETE',
  });
  return response.json();
}

export async function fetchMe(): Promise<MeResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    ...defaultFetchOptions,
    method: 'GET',
  });
  return response.json();
}

export async function setAuthCookieWithCode(
  code: string,
  redirectUri: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/cookie`, {
    ...defaultFetchOptions,
    method: 'POST',
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
  return response.json();
}

export async function clearAuthCookie(): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/cookie`, {
    ...defaultFetchOptions,
    method: 'DELETE',
  });
  return response.json();
}

export async function getAuthCookie(): Promise<{ success: boolean; access_token?: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/cookie`, {
    ...defaultFetchOptions,
    method: 'GET',
  });
  return response.json();
}
