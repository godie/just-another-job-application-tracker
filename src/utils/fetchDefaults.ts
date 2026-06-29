/**
 * Shared fetch() defaults for same-origin /api/ endpoints.
 *
 * Both halves of the credentials invariant are critical and must travel
 * together:
 *
 *   1. Outbound — `credentials: 'include'` ensures the browser attaches
 *      the session cookie so the server can identify the user on every
 *      pull (sync, auth/me, suggestions, etc.). Without it, the server
 *      sees an anonymous request and would either reject or merge into
 *      the wrong account.
 *
 *   2. Inbound — `credentials: 'include'` also tells the browser to
 *      ACCEPT and STORE the Set-Cookie the server returns on login,
 *      register, logout, and `setAuthCookieWithCode`. Without it the
 *      response Set-Cookie is silently dropped and the user appears
 *      logged-out on what should be a successful auth round-trip.
 *
 * Spreading these into a fetch() options literal — `...defaultFetchOptions`
 * — is the project-preferred shape because it forces both halves above
 * to travel together and removes the temptation to inline only one of
 * them.
 *
 * The credentialsGuard CI guard verifies every fetch() site carries the
 * invariant through either (a) an inline `credentials: 'include'`, or
 * (b) a spread of a credential carrier declared in the same file, or
 * (c) a spread of a credential carrier imported by name from this or
 * any other module exposing an exported `defaultFetchOptions`-style
 * object-literal with the same body. If you add a new shared options
 * constant, keep the body shape — `credentials: 'include'` plus your
 * additions — and the guard will track it across the import graph.
 */

export const defaultFetchOptions: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};
